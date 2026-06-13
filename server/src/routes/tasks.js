import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendarWrite } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { taskCreateSchema, taskUpdateSchema } from '../lib/schemas.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';

export const tasksRouter = Router();

tasksRouter.get('/', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const where = { calendarId: { in: myCals.map((m) => m.calendarId) } };
  if (req.query.q) where.title = { contains: req.query.q };
  if (req.query.done === 'true') where.done = true;
  if (req.query.done === 'false') where.done = false;
  const pg = parsePagination(req.query);
  const orderBy = [{ done: 'asc' }, { dueDate: 'asc' }];
  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, orderBy, ...(pg.paginated ? { skip: pg.skip, take: pg.take } : {}) }),
  ]);
  setPaginationHeaders(res, { total, ...pg });
  res.json(tasks);
});

tasksRouter.post('/', validateBody(taskCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
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

tasksRouter.put('/:id', validateBody(taskUpdateSchema), async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const b = req.body;
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
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
