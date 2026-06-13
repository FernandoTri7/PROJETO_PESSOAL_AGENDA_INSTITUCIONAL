import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendarWrite, canWriteCalendar } from '../lib/auth.js';
import { expandRecurrences } from '../lib/recurrence.js';
import { validateBody } from '../lib/validate.js';
import { eventCreateSchema, eventUpdateSchema } from '../lib/schemas.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';
import { buildEventIcs } from '../lib/ics.js';
import { sendMail, mailConfigured } from '../lib/mailer.js';
import { clientForUser } from '../lib/google.js';
import { google } from 'googleapis';

export const eventsRouter = Router();

// Adiciona calendarIds (agenda dona + agendas espelho) ao evento e remove o join cru.
function withCalendarIds({ links, ...ev }) {
  return { ...ev, calendarIds: [ev.calendarId, ...(links || []).map((l) => l.calendarId)] };
}

// Filtra as agendas espelho informadas para as que o usuário pode escrever,
// removendo a agenda dona e duplicatas.
async function allowedLinkCalendars(req, ids, ownerId) {
  const unique = [...new Set((ids || []).filter((id) => id && id !== ownerId))];
  const out = [];
  for (const id of unique) {
    if (await canWriteCalendar(req, id)) out.push(id);
  }
  return out;
}

// GET /api/events?calendarIds=a,b&from=ISO&to=ISO&q=texto
// Retorna eventos do período, com ocorrências de recorrência expandidas.
eventsRouter.get('/', async (req, res) => {
  const { from, to, q } = req.query;
  let calendarIds = (req.query.calendarIds || '').split(',').filter(Boolean);
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const allowed = new Set(myCals.map((m) => m.calendarId));
  calendarIds = calendarIds.length
    ? calendarIds.filter((id) => req.isElevated || allowed.has(id))
    : [...allowed];

  // Inclui eventos da agenda dona OU espelhados em alguma agenda visível.
  const calFilter = {
    OR: [
      { calendarId: { in: calendarIds } },
      { links: { some: { calendarId: { in: calendarIds } } } },
    ],
  };
  const where = q
    ? { AND: [calFilter, { OR: [{ title: { contains: q } }, { description: { contains: q } }, { location: { contains: q } }] }] }
    : calFilter;

  const events = await prisma.event.findMany({
    where,
    orderBy: { start: 'asc' },
    include: { guests: true, attachments: true, links: true },
  });
  const withCals = events.map(withCalendarIds);
  const fromD = from ? new Date(from) : null;
  const toD = to ? new Date(to) : null;
  // A paginação é aplicada sobre as ocorrências já expandidas (recorrências geram itens extras).
  const expanded = expandRecurrences(withCals, fromD, toD);
  const pg = parsePagination(req.query);
  setPaginationHeaders(res, { total: expanded.length, ...pg });
  res.json(pg.paginated ? expanded.slice(pg.skip, pg.skip + pg.take) : expanded);
});

eventsRouter.post('/', validateBody(eventCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
  const linkIds = await allowedLinkCalendars(req, b.linkedCalendarIds, b.calendarId);
  const event = await prisma.event.create({
    data: {
      calendarId: b.calendarId,
      creatorId: req.user.id,
      title: b.title,
      description: b.description,
      location: b.location,
      start: new Date(b.start),
      end: new Date(b.end || b.start),
      allDay: !!b.allDay,
      category: b.category || 'OUTRO',
      color: b.color,
      rrule: b.rrule,
      reminders: b.reminders,
      visibility: b.visibility || 'padrao',
      availability: b.availability || 'OCUPADO',
      videoConfLink: b.videoConfLink,
      guests: b.guests?.length ? { create: b.guests.map((g) => ({ email: g.email, name: g.name })) } : undefined,
      attachments: b.attachments?.length
        ? { create: b.attachments.map((a) => ({ name: a.name, url: a.url, provider: a.provider || 'link', mimeType: a.mimeType })) }
        : undefined,
      links: linkIds.length ? { create: linkIds.map((calendarId) => ({ calendarId })) } : undefined,
    },
    include: { guests: true, attachments: true, links: true },
  });
  res.json(withCalendarIds(event));
});

eventsRouter.put('/:id', validateBody(eventUpdateSchema), async (req, res) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const b = req.body;
  // Permite trocar a agenda dona (requer escrita na nova agenda).
  let ownerCalId = existing.calendarId;
  if (b.calendarId && b.calendarId !== existing.calendarId) {
    if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
    ownerCalId = b.calendarId;
  }
  const linkIds = b.linkedCalendarIds !== undefined
    ? await allowedLinkCalendars(req, b.linkedCalendarIds, ownerCalId)
    : null;
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      calendarId: ownerCalId,
      title: b.title ?? existing.title,
      description: b.description,
      location: b.location,
      start: b.start ? new Date(b.start) : existing.start,
      end: b.end ? new Date(b.end) : existing.end,
      allDay: b.allDay ?? existing.allDay,
      category: b.category ?? existing.category,
      color: b.color,
      rrule: b.rrule,
      reminders: b.reminders,
      visibility: b.visibility ?? existing.visibility,
      availability: b.availability ?? existing.availability,
      videoConfLink: b.videoConfLink,
      // Listas: quando enviadas, substituem por completo (replace).
      guests: b.guests ? { deleteMany: {}, create: b.guests.map((g) => ({ email: g.email, name: g.name })) } : undefined,
      attachments: b.attachments
        ? { deleteMany: {}, create: b.attachments.map((a) => ({ name: a.name, url: a.url, provider: a.provider || 'link', mimeType: a.mimeType })) }
        : undefined,
      links: linkIds !== null
        ? { deleteMany: {}, create: linkIds.map((calendarId) => ({ calendarId })) }
        : undefined,
    },
    include: { guests: true, attachments: true, links: true },
  });
  res.json(withCalendarIds(event));
});

eventsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Envia convite por e-mail a cada convidado, com anexo .ics e links de RSVP.
// Requer permissão de escrita na agenda. Sem SMTP configurado, simula o envio.
eventsRouter.post('/:id/invite', async (req, res) => {
  const ev = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { guests: true, calendar: true },
  });
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendarWrite(req, res, ev.calendarId))) return;
  if (!ev.guests.length) return res.status(400).json({ error: 'Nenhum convidado neste evento' });

  const base = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;
  const ics = buildEventIcs(ev);
  const quando = new Date(ev.start).toLocaleString('pt-BR');

  const results = [];
  for (const g of ev.guests) {
    const accept = `${base}/api/rsvp?token=${g.token}&status=ACEITO`;
    const decline = `${base}/api/rsvp?token=${g.token}&status=RECUSADO`;
    const text = `Você foi convidado para "${ev.title}" em ${quando}.`
      + `${ev.location ? `\nLocal: ${ev.location}` : ''}`
      + `${ev.videoConfLink ? `\nVideoconferência: ${ev.videoConfLink}` : ''}`
      + `\n\nConfirmar presença: ${accept}\nRecusar: ${decline}`;
    const html = `<p>Você foi convidado para <strong>${ev.title}</strong> em ${quando}.</p>`
      + `${ev.location ? `<p>Local: ${ev.location}</p>` : ''}`
      + `${ev.videoConfLink ? `<p>Videoconferência: <a href="${ev.videoConfLink}">${ev.videoConfLink}</a></p>` : ''}`
      + `<p><a href="${accept}">Confirmar presença</a> &nbsp;|&nbsp; <a href="${decline}">Recusar</a></p>`;
    try {
      const r = await sendMail({ to: g.email, subject: `Convite: ${ev.title}`, text, html, icsContent: ics });
      results.push({ email: g.email, sent: r.sent });
    } catch (e) {
      results.push({ email: g.email, sent: false, error: e.message });
    }
  }
  res.json({ configured: mailConfigured, results });
});

// Gera um link do Google Meet criando um evento no Google Calendar do usuário (conta conectada).
// Grava o link em videoConfLink.
eventsRouter.post('/:id/meet', async (req, res) => {
  const ev = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendarWrite(req, res, ev.calendarId))) return;

  const client = await clientForUser(req.user.id);
  if (!client) return res.status(400).json({ error: 'Conecte sua conta Google em Mais → Preferências.' });

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const r = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: ev.title,
        description: ev.description || undefined,
        location: ev.location || undefined,
        start: { dateTime: new Date(ev.start).toISOString() },
        end: { dateTime: new Date(ev.end).toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `${ev.id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });
    const link = r.data.hangoutLink
      || r.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri
      || null;
    if (!link) return res.status(502).json({ error: 'Google não retornou link do Meet' });
    const updated = await prisma.event.update({ where: { id: ev.id }, data: { videoConfLink: link } });
    res.json({ videoConfLink: updated.videoConfLink });
  } catch (e) {
    res.status(502).json({ error: `Falha ao gerar Meet: ${e.message}` });
  }
});
