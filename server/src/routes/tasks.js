import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendar } from '../lib/auth.js';

export const tasksRouter = Router();

tasksRouter.get('/', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const where = { calendarId: { in: myCals.map((m) => m.calendarId) } };
  if (req.query.q) where.title = { contains: req.query.q };
  if (req.query.done === 'true') where.done = true;
  if (req.query.done === 'false') where.done = false;
  const tasks = await prisma.task.findMany({ where, orderBy: [{ done: 'asc' }, { dueDate: 'asc' }] });
  res.json(tasks);
});

tasksRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.calendarId || !b.title) return res.status(400).json({ error: 'Campos obrigatórios: calendarId, title' });
  if (!(await requireCalendar(req, res, b.calendarId, true))) return;
  const task = await prisma.task.create({
    data: {
      calendarId: b.calendarId,
      userId: req.user.id,
      title: b.title,
      description: b.description,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      priority: b.priority || 'MEDIA',
    },
  });
  res.json(task);
});

tasksRouter.put('/:id', async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  const b = req.body || {};
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      title: b.title ?? existing.title,
      description: b.description,
      dueDate: b.dueDate ? new Date(b.dueDate) : b.dueDate === null ? null : existing.dueDate,
      priority: b.priority ?? existing.priority,
      done: b.done ?? existing.done,
    },
  });
  res.json(task);
});

tasksRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
