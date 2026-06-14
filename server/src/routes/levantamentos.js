import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { levantamentoCreateSchema, levantamentoUpdateSchema } from '../lib/schemas.js';

export const levantamentosRouter = Router();

// Estoque é ativo institucional: leitura para qualquer autenticado; escrita restrita a ADMIN/GESTOR.
const canWrite = requireRole('ADMIN', 'GESTOR');

// Inclui dados relacionados que a UI sempre exibe (M.Assistente, auxiliares e itens).
const include = {
  assistente: { select: { id: true, nome: true, grau: true } },
  auxiliares: { include: { associado: { select: { id: true, nome: true, grau: true } } } },
  itens: true,
};

const parseLitros = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isNaN(n) || n < 0 ? null : n;
};

// Soma dos itens = total do levantamento.
const somaItens = (itens) => (itens || []).reduce((s, i) => s + (i.litros || 0), 0);

// Normaliza um levantamento incluindo o total calculado.
const withTotal = (l) => (l ? { ...l, total: somaItens(l.itens) } : null);

// Monta os itens a gravar a partir do corpo, descartando vazios e validando litros.
function buildItens(rawItens) {
  const out = [];
  for (const it of rawItens || []) {
    if (!it || !it.nome || !String(it.nome).trim()) continue;
    const litros = parseLitros(it.litros);
    if (litros === null) continue;
    out.push({
      nome: String(it.nome).trim(),
      origem: it.origem ? String(it.origem).trim() : null,
      litros,
      local: it.local || 'FORA',
      notas: it.notas ? String(it.notas).trim() : null,
    });
  }
  return out;
}

// Valida que o M.Assistente (se informado) é associado de grau QM. Retorna mensagem de erro ou null.
async function validateAssistente(assistenteId) {
  if (!assistenteId) return null;
  const a = await prisma.associado.findUnique({ where: { id: assistenteId } });
  if (!a) return 'M. Assistente não encontrado nos associados.';
  if ((a.grau || '').toUpperCase() !== 'QM') return 'O M. Assistente deve ser um associado de grau QM.';
  return null;
}

// GET /api/levantamentos → { atual, historico } (atual = mais recente; histórico = demais, desc por data)
levantamentosRouter.get('/', async (_req, res) => {
  const todos = await prisma.levantamento.findMany({
    include,
    orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
  });
  const lista = todos.map(withTotal);
  res.json({ atual: lista[0] || null, historico: lista.slice(1) });
});

// GET /api/levantamentos/:id
levantamentosRouter.get('/:id', async (req, res) => {
  const l = await prisma.levantamento.findUnique({ where: { id: req.params.id }, include });
  if (!l) return res.status(404).json({ error: 'Levantamento não encontrado' });
  res.json(withTotal(l));
});

levantamentosRouter.post('/', canWrite, validateBody(levantamentoCreateSchema), async (req, res) => {
  const b = req.body || {};
  const erroAssist = await validateAssistente(b.assistenteId);
  if (erroAssist) return res.status(400).json({ error: erroAssist });

  const l = await prisma.levantamento.create({
    data: {
      data: new Date(b.data),
      assistenteId: b.assistenteId || null,
      notas: b.notas ? String(b.notas).trim() : null,
      itens: { create: buildItens(b.itens) },
      auxiliares: { create: (b.auxiliarIds || []).map((associadoId) => ({ associadoId })) },
    },
    include,
  });
  res.json(withTotal(l));
});

levantamentosRouter.put('/:id', canWrite, validateBody(levantamentoUpdateSchema), async (req, res) => {
  const b = req.body || {};
  const existing = await prisma.levantamento.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Levantamento não encontrado' });

  if (b.assistenteId !== undefined) {
    const erroAssist = await validateAssistente(b.assistenteId);
    if (erroAssist) return res.status(400).json({ error: erroAssist });
  }

  // Itens e auxiliares: substituição completa (apaga e recria) quando o campo vem no corpo.
  const data = {};
  if (b.data !== undefined) data.data = new Date(b.data);
  if (b.assistenteId !== undefined) data.assistenteId = b.assistenteId || null;
  if (b.notas !== undefined) data.notas = b.notas ? String(b.notas).trim() : null;
  if (b.itens !== undefined) data.itens = { deleteMany: {}, create: buildItens(b.itens) };
  if (b.auxiliarIds !== undefined)
    data.auxiliares = { deleteMany: {}, create: b.auxiliarIds.map((associadoId) => ({ associadoId })) };

  const l = await prisma.levantamento.update({ where: { id: req.params.id }, data, include });
  res.json(withTotal(l));
});

levantamentosRouter.delete('/:id', canWrite, async (req, res) => {
  await prisma.levantamento.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
