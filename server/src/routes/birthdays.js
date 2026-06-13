import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendarWrite } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { birthdayCreateSchema, birthdayUpdateSchema } from '../lib/schemas.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';

export const birthdaysRouter = Router();

// Classificação etária automática: 0-11 CRIANCA, 12-17 JOVEM, 18+ ADULTO
export function classify(birthDate, ref = new Date()) {
  const b = new Date(birthDate);
  let age = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age--;
  if (age <= 11) return { age, group: 'CRIANCA' };
  if (age <= 17) return { age, group: 'JOVEM' };
  return { age, group: 'ADULTO' };
}

function withClassification(b) {
  const { age, group } = classify(b.birthDate);
  // próximo aniversário
  const now = new Date();
  const next = new Date(now.getFullYear(), new Date(b.birthDate).getMonth(), new Date(b.birthDate).getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(next.getFullYear() + 1);
  return { ...b, age, group, nextBirthday: next };
}

birthdaysRouter.get('/', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const where = { calendarId: { in: myCals.map((m) => m.calendarId) } };
  if (req.query.q) where.name = { contains: req.query.q };
  const list = await prisma.birthday.findMany({ where, orderBy: { name: 'asc' } });
  let result = list.map(withClassification);
  if (req.query.group) result = result.filter((b) => b.group === req.query.group);
  result.sort((a, b) => a.nextBirthday - b.nextBirthday);
  // Paginação sobre a lista já classificada e ordenada por próximo aniversário.
  const pg = parsePagination(req.query);
  setPaginationHeaders(res, { total: result.length, ...pg });
  res.json(pg.paginated ? result.slice(pg.skip, pg.skip + pg.take) : result);
});

birthdaysRouter.post('/', validateBody(birthdayCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
  const created = await prisma.birthday.create({
    data: { calendarId: b.calendarId, name: b.name, birthDate: new Date(b.birthDate), phone: b.phone, notes: b.notes },
  });
  res.json(withClassification(created));
});

birthdaysRouter.put('/:id', validateBody(birthdayUpdateSchema), async (req, res) => {
  const existing = await prisma.birthday.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Aniversário não encontrado' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const b = req.body;
  const updated = await prisma.birthday.update({
    where: { id: req.params.id },
    data: {
      name: b.name ?? existing.name,
      birthDate: b.birthDate ? new Date(b.birthDate) : existing.birthDate,
      phone: b.phone,
      notes: b.notes,
    },
  });
  res.json(withClassification(updated));
});

birthdaysRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.birthday.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Aniversário não encontrado' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  await prisma.birthday.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
