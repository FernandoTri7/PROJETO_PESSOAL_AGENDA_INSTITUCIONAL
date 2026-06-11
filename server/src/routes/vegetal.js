import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { vegetalCreateSchema, vegetalUpdateSchema } from '../lib/schemas.js';

export const vegetalRouter = Router();

// Estoque é ativo institucional global: escrita restrita a ADMIN/GESTOR (RF-04 da spec de estoque).
// Leitura segue disponível a qualquer usuário autenticado (authMiddleware no index).
const canWrite = requireRole('ADMIN', 'GESTOR');

// Converte litros para número não-negativo; retorna null se inválido.
function parseLitros(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

vegetalRouter.get('/', async (_req, res) => {
  const [lotes, agg] = await Promise.all([
    prisma.vegetalLote.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.vegetalLote.aggregate({ _sum: { litros: true } }),
  ]);
  res.json({ total: agg._sum.litros || 0, lotes });
});

vegetalRouter.post('/', canWrite, validateBody(vegetalCreateSchema), async (req, res) => {
  const b = req.body || {};
  if (!b.nome || b.litros === undefined) return res.status(400).json({ error: 'Campos obrigatórios: nome, litros' });
  const litros = parseLitros(b.litros);
  if (litros === null) return res.status(400).json({ error: 'litros deve ser um número não negativo' });
  const lote = await prisma.vegetalLote.create({
    data: { nome: b.nome, origem: b.origem, litros, local: b.local || 'FORA', notas: b.notas },
  });
  res.json(lote);
});

vegetalRouter.put('/:id', canWrite, validateBody(vegetalUpdateSchema), async (req, res) => {
  const b = req.body || {};
  let litros;
  if (b.litros !== undefined) {
    litros = parseLitros(b.litros);
    if (litros === null) return res.status(400).json({ error: 'litros deve ser um número não negativo' });
  }
  const lote = await prisma.vegetalLote.update({
    where: { id: req.params.id },
    data: {
      nome: b.nome,
      origem: b.origem,
      litros,
      local: b.local,
      notas: b.notas,
    },
  });
  res.json(lote);
});

vegetalRouter.delete('/:id', canWrite, async (req, res) => {
  await prisma.vegetalLote.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
