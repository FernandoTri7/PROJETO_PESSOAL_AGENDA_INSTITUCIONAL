import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendar } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { sessionCreateSchema, sessionUpdateSchema } from '../lib/schemas.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';

export const sessionsRouter = Router();

const FLOAT_FIELDS = ['coadoLitros', 'comungadoLitros', 'retornoLitros'];
const INT_FIELDS = ['coposSimples', 'coposDuplos', 'coposCriancas', 'repeticoes'];
const TEXT_FIELDS = [
  'type', 'title', 'dirigente', 'assistente', 'auxAssistente', 'som',
  'leituraDocumentos', 'explanacao', 'vegetalDescricao', 'observacoes',
];

function buildData(b) {
  const data = {};
  for (const f of TEXT_FIELDS) if (b[f] !== undefined) data[f] = b[f];
  for (const f of FLOAT_FIELDS) if (b[f] !== undefined) data[f] = b[f] === null ? null : parseFloat(b[f]);
  for (const f of INT_FIELDS) if (b[f] !== undefined) data[f] = b[f] === null ? null : parseInt(b[f], 10);
  if (b.date) data.date = new Date(b.date);
  return data;
}

sessionsRouter.get('/', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const where = { calendarId: { in: myCals.map((m) => m.calendarId) } };
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = new Date(req.query.from);
    if (req.query.to) where.date.lte = new Date(req.query.to);
  }
  if (req.query.type) where.type = req.query.type;
  if (req.query.q) {
    where.OR = [
      { title: { contains: req.query.q } },
      { dirigente: { contains: req.query.q } },
      { vegetalDescricao: { contains: req.query.q } },
    ];
  }
  const pg = parsePagination(req.query);
  const [total, sessions] = await Promise.all([
    prisma.sessionRecord.count({ where }),
    prisma.sessionRecord.findMany({ where, orderBy: { date: 'desc' }, ...(pg.paginated ? { skip: pg.skip, take: pg.take } : {}) }),
  ]);
  setPaginationHeaders(res, { total, ...pg });
  res.json(sessions);
});

// Estatísticas: totais de copos e litros por período
sessionsRouter.get('/stats', async (req, res) => {
  const myCals = await prisma.calendarMember.findMany({ where: { userId: req.user.id }, select: { calendarId: true } });
  const where = { calendarId: { in: myCals.map((m) => m.calendarId) } };
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = new Date(req.query.from);
    if (req.query.to) where.date.lte = new Date(req.query.to);
  }
  // Agregação no banco: soma e contagem sem carregar os registros em memória.
  const [agg, porTipoRaw] = await Promise.all([
    prisma.sessionRecord.aggregate({
      where,
      _count: { _all: true },
      _sum: {
        coadoLitros: true,
        retornoLitros: true,
        coposSimples: true,
        coposDuplos: true,
        coposCriancas: true,
      },
    }),
    prisma.sessionRecord.groupBy({ by: ['type'], where, _count: { _all: true } }),
  ]);
  const porTipo = Object.fromEntries(porTipoRaw.map((r) => [r.type, r._count._all]));
  res.json({
    totalSessoes: agg._count._all,
    coadoLitros: agg._sum.coadoLitros || 0,
    retornoLitros: agg._sum.retornoLitros || 0,
    coposSimples: agg._sum.coposSimples || 0,
    coposDuplos: agg._sum.coposDuplos || 0,
    coposCriancas: agg._sum.coposCriancas || 0,
    porTipo,
  });
});

sessionsRouter.post('/', validateBody(sessionCreateSchema), async (req, res) => {
  const b = req.body;
  if (!(await requireCalendar(req, res, b.calendarId, true))) return;
  const session = await prisma.sessionRecord.create({
    data: { calendarId: b.calendarId, creatorId: req.user.id, ...buildData(b) },
  });
  res.json(session);
});

sessionsRouter.put('/:id', validateBody(sessionUpdateSchema), async (req, res) => {
  const existing = await prisma.sessionRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sessão não encontrada' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  const session = await prisma.sessionRecord.update({ where: { id: req.params.id }, data: buildData(req.body || {}) });
  res.json(session);
});

sessionsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.sessionRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sessão não encontrada' });
  if (!(await requireCalendar(req, res, existing.calendarId, true))) return;
  await prisma.sessionRecord.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
