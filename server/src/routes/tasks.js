import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendarWrite } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { taskCreateSchema, taskUpdateSchema } from '../lib/schemas.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';

export const tasksRouter = Router();

// Dados relacionados retornados em cada tarefa (responsável, grupo, anexos).
const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true } },
  group: { select: { id: true, name: true } },
  attachments: true,
};

const DEFAULT_ACTIVATION_DAYS = 10;

const attachmentCreate = (list) =>
  (list || []).map((a) => ({ name: a.name, url: a.url, provider: a.provider || 'link', mimeType: a.mimeType || null }));

// Período (dias) para ativar uma tarefa rápida, lido das prefs do usuário (fallback 7; 0 = nunca expira).
function activationDays(req) {
  try {
    const prefs = req.user?.prefs ? JSON.parse(req.user.prefs) : {};
    const n = Number(prefs.taskActivationDays);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_ACTIVATION_DAYS;
  } catch { return DEFAULT_ACTIVATION_DAYS; }
}

// Valida que o responsável é membro da agenda e que o grupo pertence a ela.
async function validateRelations(calendarId, assigneeId, groupId) {
  if (assigneeId) {
    const member = await prisma.calendarMember.findUnique({
      where: { calendarId_userId: { calendarId, userId: assigneeId } },
    });
    if (!member) return 'O responsável precisa ser membro da agenda.';
  }
  if (groupId) {
    const group = await prisma.taskGroup.findUnique({ where: { id: groupId } });
    if (!group || group.calendarId !== calendarId) return 'Grupo inválido para esta agenda.';
  }
  return null;
}

// Limpeza preguiçosa: manda para a lixeira as tarefas não-ativadas cujo prazo de ativação expirou.
async function purgeExpired(req, calendarIds) {
  const days = activationDays(req);
  if (!days) return; // 0 = nunca expira
  const cutoff = new Date(Date.now() - days * 86400000);
  await prisma.task.updateMany({
    where: { calendarId: { in: calendarIds }, activated: false, deletedAt: null, createdAt: { lt: cutoff } },
    data: { deletedAt: new Date() },
  });
}

tasksRouter.get('/', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const calendarIds = myCals.map((m) => m.calendarId);
  const isTrash = req.query.trash === '1' || req.query.trash === 'true';
  if (!isTrash) await purgeExpired(req, calendarIds);

  const where = { calendarId: { in: calendarIds }, deletedAt: isTrash ? { not: null } : null };
  if (req.query.q) where.title = { contains: req.query.q };
  if (req.query.done === 'true') where.done = true;
  if (req.query.done === 'false') where.done = false;
  if (req.query.calendarId) where.calendarId = req.query.calendarId;
  if (req.query.groupId) where.groupId = req.query.groupId;
  if (req.query.assigneeId) where.assigneeId = req.query.assigneeId;
  const pg = parsePagination(req.query);
  const orderBy = isTrash ? [{ deletedAt: 'desc' }] : [{ done: 'asc' }, { dueDate: 'asc' }];
  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, orderBy, include: TASK_INCLUDE, ...(pg.paginated ? { skip: pg.skip, take: pg.take } : {}) }),
  ]);
  setPaginationHeaders(res, { total, ...pg });
  res.json(tasks);
});

tasksRouter.post('/', validateBody(taskCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
  const relErr = await validateRelations(b.calendarId, b.assigneeId || null, b.groupId || null);
  if (relErr) return res.status(400).json({ error: relErr });
  const task = await prisma.task.create({
    data: {
      calendarId: b.calendarId,
      userId: req.user.id,
      title: b.title,
      description: b.description,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      priority: b.priority || 'MEDIA',
      activated: b.activated !== undefined ? b.activated : true,
      groupId: b.groupId || null,
      assigneeId: b.assigneeId || null,
      attachments: b.attachments?.length ? { create: attachmentCreate(b.attachments) } : undefined,
    },
    include: TASK_INCLUDE,
  });
  res.json(task);
});

tasksRouter.put('/:id', validateBody(taskUpdateSchema), async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const b = req.body;
  // Campos relacionais: undefined = mantém; null/"" = limpa; valor = define.
  const assigneeId = b.assigneeId === undefined ? existing.assigneeId : (b.assigneeId || null);
  const groupId = b.groupId === undefined ? existing.groupId : (b.groupId || null);
  const relErr = await validateRelations(existing.calendarId, assigneeId, groupId);
  if (relErr) return res.status(400).json({ error: relErr });
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      title: b.title ?? existing.title,
      description: b.description,
      dueDate: b.dueDate ? new Date(b.dueDate) : b.dueDate === null ? null : existing.dueDate,
      priority: b.priority ?? existing.priority,
      done: b.done ?? existing.done,
      activated: b.activated ?? existing.activated,
      groupId,
      assigneeId,
      // attachments: só toca quando o corpo traz a lista (substitui por completo).
      attachments: b.attachments ? { deleteMany: {}, create: attachmentCreate(b.attachments) } : undefined,
    },
    include: TASK_INCLUDE,
  });
  res.json(task);
});

// Restaura uma tarefa da lixeira (deletedAt = null).
tasksRouter.post('/:id/restore', async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const task = await prisma.task.update({ where: { id: req.params.id }, data: { deletedAt: null }, include: TASK_INCLUDE });
  res.json(task);
});

// DELETE: por padrão manda para a lixeira (soft delete). ?permanent=1 apaga definitivamente.
tasksRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const permanent = req.query.permanent === '1' || req.query.permanent === 'true';
  if (permanent) {
    await prisma.task.delete({ where: { id: req.params.id } });
  } else {
    await prisma.task.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  }
  res.json({ ok: true });
});
