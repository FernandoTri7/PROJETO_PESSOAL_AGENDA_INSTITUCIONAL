import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendar } from '../lib/auth.js';

export const calendarsRouter = Router();

// Lista agendas do usuário (todas, se ADMIN)
calendarsRouter.get('/', async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { members: { some: { userId: req.user.id } } };
  const calendars = await prisma.calendar.findMany({
    where,
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  res.json(calendars);
});

calendarsRouter.post('/', async (req, res) => {
  const { name, type = 'PESSOAL', color = '#1a73e8' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Informe o nome da agenda' });
  const cal = await prisma.calendar.create({
    data: { name, type, color, members: { create: { userId: req.user.id, role: 'OWNER' } } },
  });
  res.json(cal);
});

calendarsRouter.put('/:id', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.id, true))) return;
  const { name, type, color } = req.body || {};
  const cal = await prisma.calendar.update({ where: { id: req.params.id }, data: { name, type, color } });
  res.json(cal);
});

calendarsRouter.delete('/:id', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.id, true))) return;
  await prisma.calendar.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Compartilhamento: adiciona membro por e-mail
calendarsRouter.post('/:id/members', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.id, true))) return;
  const { email, role = 'VIEWER' } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email: email || '' } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const member = await prisma.calendarMember.upsert({
    where: { calendarId_userId: { calendarId: req.params.id, userId: user.id } },
    update: { role },
    create: { calendarId: req.params.id, userId: user.id, role },
  });
  res.json(member);
});

calendarsRouter.delete('/:id/members/:userId', async (req, res) => {
  if (!(await requireCalendar(req, res, req.params.id, true))) return;
  await prisma.calendarMember.delete({
    where: { calendarId_userId: { calendarId: req.params.id, userId: req.params.userId } },
  });
  res.json({ ok: true });
});
