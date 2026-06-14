import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendarWrite } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { taskGroupCreateSchema, taskGroupUpdateSchema } from '../lib/schemas.js';

export const taskGroupsRouter = Router();

// GET /api/task-groups?calendarId=...  → grupos das agendas do usuário (ou de uma agenda).
taskGroupsRouter.get('/', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const where = { calendarId: { in: myCals.map((m) => m.calendarId) } };
  if (req.query.calendarId) where.calendarId = req.query.calendarId;
  const groups = await prisma.taskGroup.findMany({ where, orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  res.json(groups);
});

taskGroupsRouter.post('/', validateBody(taskGroupCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
  const group = await prisma.taskGroup.create({
    data: { calendarId: b.calendarId, name: b.name, order: b.order !== undefined ? Number(b.order) : 0 },
  });
  res.json(group);
});

taskGroupsRouter.put('/:id', validateBody(taskGroupUpdateSchema), async (req, res) => {
  const existing = await prisma.taskGroup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Grupo não encontrado' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const b = req.body;
  const group = await prisma.taskGroup.update({
    where: { id: req.params.id },
    data: { name: b.name ?? existing.name, order: b.order !== undefined ? Number(b.order) : undefined },
  });
  res.json(group);
});

// Exclui o grupo; as tarefas permanecem (groupId vira null por onDelete: SetNull).
taskGroupsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.taskGroup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Grupo não encontrado' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  await prisma.taskGroup.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
