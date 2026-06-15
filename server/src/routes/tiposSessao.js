import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { tipoSessaoCreateSchema, tipoSessaoUpdateSchema } from '../lib/schemas.js';

export const tiposSessaoRouter = Router();

const canWrite = requireRole('ADMIN', 'GESTOR');

// Deriva uma key estável (MAIÚSCULAS, sem acento) a partir do label, quando não informada.
function slugKey(label) {
  return String(label || '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toUpperCase().trim()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'TIPO';
}

const intOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

// GET /api/tipos-sessao?all=1 → ativos por padrão, ordenados por ordem/label.
tiposSessaoRouter.get('/', async (req, res) => {
  const where = req.query.all === '1' ? {} : { ativo: true };
  const lista = await prisma.tipoSessao.findMany({ where, orderBy: [{ ordem: 'asc' }, { label: 'asc' }] });
  res.json(lista);
});

tiposSessaoRouter.post('/', canWrite, validateBody(tipoSessaoCreateSchema), async (req, res) => {
  const b = req.body;
  const key = (b.key && b.key.trim()) || slugKey(b.label);
  const dup = await prisma.tipoSessao.findUnique({ where: { key } });
  if (dup) return res.status(409).json({ error: `Já existe um tipo com a key "${key}".` });
  const t = await prisma.tipoSessao.create({
    data: { key, label: b.label.trim(), cor: b.cor || null, ordem: intOrNull(b.ordem) ?? 0, ativo: b.ativo !== undefined ? !!b.ativo : true },
  });
  res.json(t);
});

tiposSessaoRouter.put('/:id', canWrite, validateBody(tipoSessaoUpdateSchema), async (req, res) => {
  const existing = await prisma.tipoSessao.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Tipo de sessão não encontrado' });
  const b = req.body || {};
  const data = {};
  if (b.label !== undefined) data.label = String(b.label).trim();
  if (b.cor !== undefined) data.cor = b.cor || null;
  if (b.ordem !== undefined) data.ordem = intOrNull(b.ordem) ?? 0;
  if (b.ativo !== undefined) data.ativo = !!b.ativo;
  // key só muda se enviada explicitamente e única.
  if (b.key && b.key.trim() && b.key.trim() !== existing.key) {
    const dup = await prisma.tipoSessao.findUnique({ where: { key: b.key.trim() } });
    if (dup) return res.status(409).json({ error: `Já existe um tipo com a key "${b.key.trim()}".` });
    data.key = b.key.trim();
  }
  const t = await prisma.tipoSessao.update({ where: { id: req.params.id }, data });
  res.json(t);
});

tiposSessaoRouter.delete('/:id', canWrite, async (req, res) => {
  await prisma.tipoSessao.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
