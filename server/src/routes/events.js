import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendar } from '../lib/auth.js';
import { expandRecurrences } from '../lib/recurrence.js';

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

  const events = await prisma.event.findMany({ where, orderBy: { start: 'asc' } });
  const fromD = from ? new Date(from) : null;
  const toD = to ? new Date(to) : null;
  res.json(expandRecurrences(events, fromD, toD));
});

eventsRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.calendarId || !b.title || !b.start) return res.status(400).json({ error: 'Campos obrigatórios: calendarId, title, start' });
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
    },
  });
  res.json(event);
});

eventsRouter.put('/:id', async (req, res) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  const b = req.body || {};
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
    },
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
