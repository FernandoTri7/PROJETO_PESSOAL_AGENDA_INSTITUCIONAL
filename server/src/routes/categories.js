import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../lib/schemas.js';

export const categoriesRouter = Router();

// Categorias são taxonomia global da instituição: leitura para qualquer autenticado,
// escrita restrita a ADMIN/GESTOR (mesma regra do estoque de vegetal).
const canWrite = requireRole('ADMIN', 'GESTOR');

function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/\p{M}/gu, '') // remove acentos (marcas combinantes)
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'categoria';
}

// GET /api/categories?scope=INSTITUCIONAL&all=1
// Sem scope: todas as ativas. Com scope: as do escopo + as TODAS (que atendem todas as agendas).
// all=1: inclui inativas e anexa contagem de uso (eventCount/used) — para a tela de gestão.
categoriesRouter.get('/', async (req, res) => {
  const scope = req.query.scope;
  const includeAll = req.query.all === '1' || req.query.all === 'true';
  const where = includeAll ? {} : { active: true };
  if (scope && scope !== 'TODAS') where.OR = [{ scope }, { scope: 'TODAS' }];
  const categories = await prisma.category.findMany({ where, orderBy: [{ order: 'asc' }, { label: 'asc' }] });
  if (!includeAll) return res.json(categories);

  // Conta quantos eventos usam cada key (Event.category é string, sem FK).
  const counts = await prisma.event.groupBy({ by: ['category'], _count: { _all: true } });
  const usedMap = new Map(counts.map((c) => [c.category, c._count._all]));
  res.json(categories.map((c) => ({ ...c, eventCount: usedMap.get(c.key) || 0, used: (usedMap.get(c.key) || 0) > 0 })));
});

categoriesRouter.post('/', canWrite, validateBody(categoryCreateSchema), async (req, res) => {
  const b = req.body;
  const key = (b.key && b.key.trim()) || slugify(b.label);
  const exists = await prisma.category.findUnique({ where: { key } });
  if (exists) return res.status(409).json({ error: 'Já existe uma categoria com essa chave' });
  const category = await prisma.category.create({
    data: {
      key,
      label: b.label,
      color: b.color || '#9AA0A6',
      scope: b.scope || 'TODAS',
      order: b.order !== undefined ? Number(b.order) : 0,
    },
  });
  res.json(category);
});

categoriesRouter.put('/:id', canWrite, validateBody(categoryUpdateSchema), async (req, res) => {
  const b = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      label: b.label,
      color: b.color,
      scope: b.scope,
      order: b.order !== undefined ? Number(b.order) : undefined,
      active: b.active, // ativar/desativar (undefined = não mexe)
    },
  });
  res.json(category);
});

// Exclusão DEFINITIVA — permitida apenas se a categoria não estiver em uso por nenhum evento.
// Em uso → 409 (oriente a desativar via PUT {active:false}, que não orfana eventos).
categoriesRouter.delete('/:id', canWrite, async (req, res) => {
  const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!cat) return res.status(404).json({ error: 'Categoria não encontrada' });
  const usedCount = await prisma.event.count({ where: { category: cat.key } });
  if (usedCount > 0) {
    return res.status(409).json({
      error: `Categoria em uso em ${usedCount} evento(s). Desative-a em vez de excluir.`,
    });
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
