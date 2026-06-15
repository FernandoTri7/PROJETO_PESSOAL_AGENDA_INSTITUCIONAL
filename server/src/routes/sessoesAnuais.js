import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { sessaoAnualCreateSchema, sessaoAnualUpdateSchema } from '../lib/schemas.js';

export const sessoesAnuaisRouter = Router();

// Cadastro institucional: leitura para qualquer autenticado (sugestões no formulário);
// escrita restrita a ADMIN/GESTOR.
const canWrite = requireRole('ADMIN', 'GESTOR');

const intOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

function buildData(b) {
  const data = {};
  if (b.nome !== undefined) data.nome = String(b.nome).trim();
  if (b.dia !== undefined) data.dia = intOrNull(b.dia);
  if (b.mes !== undefined) data.mes = intOrNull(b.mes);
  if (b.tipo !== undefined) data.tipo = b.tipo;
  if (b.ativo !== undefined) data.ativo = !!b.ativo;
  if (b.ordem !== undefined) data.ordem = intOrNull(b.ordem) ?? 0;
  return data;
}

// GET /api/sessoes-anuais?tipo=&all=1  → lista ordenada por mês/dia (ativas por padrão).
sessoesAnuaisRouter.get('/', async (req, res) => {
  const where = {};
  if (req.query.tipo) where.tipo = String(req.query.tipo);
  if (req.query.all !== '1') where.ativo = true;
  const lista = await prisma.sessaoAnual.findMany({
    where,
    orderBy: [{ mes: 'asc' }, { dia: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
  });
  res.json(lista);
});

sessoesAnuaisRouter.post('/', canWrite, validateBody(sessaoAnualCreateSchema), async (req, res) => {
  const sa = await prisma.sessaoAnual.create({ data: buildData(req.body) });
  res.json(sa);
});

sessoesAnuaisRouter.put('/:id', canWrite, validateBody(sessaoAnualUpdateSchema), async (req, res) => {
  const existing = await prisma.sessaoAnual.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sessão anual não encontrada' });
  const sa = await prisma.sessaoAnual.update({ where: { id: req.params.id }, data: buildData(req.body || {}) });
  res.json(sa);
});

sessoesAnuaisRouter.delete('/:id', canWrite, async (req, res) => {
  await prisma.sessaoAnual.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
