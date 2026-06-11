import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendar } from '../lib/auth.js';
import { expandRecurrences } from '../lib/recurrence.js';
import { validateBody } from '../lib/validate.js';
import { eventCreateSchema, eventUpdateSchema } from '../lib/schemas.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';

export const eventsRouter = Router();

// GET /api/events?calendarIds=a,b&from=ISO&to=ISO&q=texto
// Retorna eventos do período, com ocorrências de recorrência expandidas.
eventsRouter.get('/', async (req, res) => {
  const { from, to, q } = req.query;
  let calendarIds = (req.query.calendarIds || '').split(',').filter(Boolean);
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const allowed = new Set(myCals.map((m) => m.calendarId));
  calendarIds = calendarIds.length
    ? calendarIds.filter((id) => req.user.role === 'ADMIN' || allowed.has(id))
    : [...allowed];

  const where = { calendarId: { in: calendarIds } };
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }, { location: { contains: q } }];

  const events = await prisma.event.findMany({
    where,
    orderBy: { start: 'asc' },
    include: { guests: true, attachments: true },
  });
  const fromD = from ? new Date(from) : null;
  const toD = to ? new Date(to) : null;
  // A paginação é aplicada sobre as ocorrências já expandidas (recorrências geram itens extras).
  const expanded = expandRecurrences(events, fromD, toD);
  const pg = parsePagination(req.query);
  setPaginationHeaders(res, { total: expanded.length, ...pg });
  res.json(pg.paginated ? expanded.slice(pg.skip, pg.skip + pg.take) : expanded);
});

eventsRouter.post('/', validateBody(eventCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendar(req, res, b.calendarId, true))) return;
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
    },
    include: { guests: true, attachments: true },
  });
  res.json(event);
});

eventsRouter.put('/:id', validateBody(eventUpdateSchema), async (req, res) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  const b = req.body;
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: {
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
    },
    include: { guests: true, attachments: true },
  });
  res.json(event);
});

eventsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
