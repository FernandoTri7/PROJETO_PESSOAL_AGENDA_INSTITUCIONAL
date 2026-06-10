import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const vegetalRouter = Router();

vegetalRouter.get('/', async (_req, res) => {
  const lotes = await prisma.vegetalLote.findMany({ orderBy: { updatedAt: 'desc' } });
  const total = lotes.reduce((acc, l) => acc + l.litros, 0);
  res.json({ total, lotes });
});

vegetalRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.nome || b.litros === undefined) return res.status(400).json({ error: 'Campos obrigatórios: nome, litros' });
  const lote = await prisma.vegetalLote.create({
    data: { nome: b.nome, origem: b.origem, litros: parseFloat(b.litros), local: b.local || 'FORA', notas: b.notas },
  });
  res.json(lote);
});

vegetalRouter.put('/:id', async (req, res) => {
  const b = req.body || {};
  const lote = await prisma.vegetalLote.update({
    where: { id: req.params.id },
    data: {
      nome: b.nome,
      origem: b.origem,
      litros: b.litros !== undefined ? parseFloat(b.litros) : undefined,
      local: b.local,
      notas: b.notas,
    },
  });
  res.json(lote);
});

vegetalRouter.delete('/:id', async (req, res) => {
  await prisma.vegetalLote.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
