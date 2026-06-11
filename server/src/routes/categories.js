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

// GET /api/categories?scope=INSTITUCIONAL
// Sem scope: todas as ativas. Com scope: as do escopo + as TODAS (que atendem todas as agendas).
categoriesRouter.get('/', async (req, res) => {
  const scope = req.query.scope;
  const where = { active: true };
  if (scope && scope !== 'TODAS') where.OR = [{ scope }, { scope: 'TODAS' }];
  const categories = await prisma.category.findMany({ where, orderBy: [{ order: 'asc' }, { label: 'asc' }] });
  res.json(categories);
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
    },
  });
  res.json(category);
});

// Soft-delete: marca inativa para não orfanar eventos que ainda usam a key.
categoriesRouter.delete('/:id', canWrite, async (req, res) => {
  await prisma.category.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
});
