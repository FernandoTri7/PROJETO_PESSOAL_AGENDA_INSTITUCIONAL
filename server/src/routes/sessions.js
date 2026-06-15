import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCalendarWrite } from '../lib/auth.js';
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
  if (b.transmissaoAssistencia !== undefined) data.transmissaoAssistencia = !!b.transmissaoAssistencia;
  if (b.dirigidaPorAutoridade !== undefined) data.dirigidaPorAutoridade = !!b.dirigidaPorAutoridade;
  if (b.date) data.date = new Date(b.date);
  return data;
}

// Inclui as participações já com o associado (para o formulário recarregar os papéis).
const participationInclude = {
  participations: { include: { associado: { select: { id: true, nome: true, grau: true } } } },
};

// Mapeia cada papel único da sessão à sua função na estatística.
const PAPEL_FUNCAO = {
  dirigente: 'DIRECAO',
  assistente: 'ASSISTENTE',
  som: 'SOM',
  leitura: 'LEITURA',
  explanacao: 'EXPLANACAO',
  mestreEntrega: 'TRANSMISSAO_ENTREGA',
  mestrePega: 'TRANSMISSAO_PEGA',
};

const pessoaVazia = (p) => !p || (!p.associadoId && !(p.nome && String(p.nome).trim()));

// Resolve nome/grau das pessoas referenciadas por associadoId, em uma única consulta.
async function resolverAssociados(papeis, auxiliares) {
  const ids = new Set();
  for (const p of Object.values(papeis || {})) if (p && p.associadoId) ids.add(p.associadoId);
  for (const a of auxiliares || []) if (a && a.associadoId) ids.add(a.associadoId);
  if (!ids.size) return {};
  const lista = await prisma.associado.findMany({ where: { id: { in: [...ids] } }, select: { id: true, nome: true, grau: true } });
  return Object.fromEntries(lista.map((a) => [a.id, a]));
}

// A partir de papeis+auxiliares, monta as linhas de participação e os campos de texto denormalizados.
function montarParticipacaoETexto(papeis, auxiliares, mapa, data) {
  const rows = [];
  const nomeDe = (p) => (p.associadoId ? mapa[p.associadoId]?.nome : (p.nome || '').trim()) || null;
  const grauDe = (p) => (p.associadoId ? mapa[p.associadoId]?.grau : (p.grau || null)) || null;
  const add = (p, funcao) => {
    if (pessoaVazia(p)) return;
    rows.push({
      associadoId: p.associadoId || null,
      nomeTexto: nomeDe(p),
      grau: grauDe(p),
      nucleo: p.associadoId ? null : (p.nucleo || null),
      funcao,
      data,
    });
  };
  for (const [papel, funcao] of Object.entries(PAPEL_FUNCAO)) add(papeis?.[papel], funcao);
  for (const aux of auxiliares || []) add(aux, 'AUX_ASSISTENTE');

  // Texto denormalizado (mantém a lista/filtro atuais funcionando).
  const texto = {};
  if (papeis) {
    texto.dirigente = pessoaVazia(papeis.dirigente) ? null : nomeDe(papeis.dirigente);
    texto.assistente = pessoaVazia(papeis.assistente) ? null : nomeDe(papeis.assistente);
    texto.som = pessoaVazia(papeis.som) ? null : nomeDe(papeis.som);
    texto.leituraDocumentos = pessoaVazia(papeis.leitura) ? null : nomeDe(papeis.leitura);
    texto.explanacao = pessoaVazia(papeis.explanacao) ? null : nomeDe(papeis.explanacao);
  }
  if (auxiliares) {
    texto.auxAssistente = (auxiliares || []).filter((a) => !pessoaVazia(a)).map(nomeDe).filter(Boolean).join(', ') || null;
  }
  return { rows, texto };
}

// Valida regras da Transmissão da Assistência. Retorna mensagem de erro ou null.
function validarTransmissao(b, tipoFinal) {
  if (!b.transmissaoAssistencia) return null;
  if (tipoFinal !== 'ESCALA' && tipoFinal !== 'EXTRA') {
    return 'Transmissão da Assistência só é permitida em sessões de Escala ou Extra.';
  }
  if (pessoaVazia(b.papeis?.mestreEntrega) || pessoaVazia(b.papeis?.mestrePega)) {
    return 'Na Transmissão da Assistência, informe o Mestre que entrega e o Mestre que pega.';
  }
  return null;
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
    prisma.sessionRecord.findMany({ where, orderBy: { date: 'desc' }, include: participationInclude, ...(pg.paginated ? { skip: pg.skip, take: pg.take } : {}) }),
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
  if (!(await requireCalendarWrite(req, res, b.calendarId))) return;
  const tipoFinal = b.type || 'ESCALA';
  const erroTransm = validarTransmissao(b, tipoFinal);
  if (erroTransm) return res.status(400).json({ error: erroTransm });

  const data = buildData(b);
  // Papéis estruturados → participações + texto denormalizado.
  if (b.papeis !== undefined || b.auxiliares !== undefined) {
    const mapa = await resolverAssociados(b.papeis, b.auxiliares);
    const { rows, texto } = montarParticipacaoETexto(b.papeis, b.auxiliares, mapa, new Date(b.date));
    Object.assign(data, texto);
    data.participations = { create: rows };
  }
  const session = await prisma.sessionRecord.create({
    data: { calendarId: b.calendarId, creatorId: req.user.id, ...data },
    include: participationInclude,
  });
  res.json(session);
});

sessionsRouter.put('/:id', validateBody(sessionUpdateSchema), async (req, res) => {
  const existing = await prisma.sessionRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sessão não encontrada' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  const b = req.body || {};
  const tipoFinal = b.type || existing.type;
  const erroTransm = validarTransmissao(b, tipoFinal);
  if (erroTransm) return res.status(400).json({ error: erroTransm });

  const data = buildData(b);
  // Substituição completa das participações quando papéis/auxiliares vierem no corpo.
  if (b.papeis !== undefined || b.auxiliares !== undefined) {
    const mapa = await resolverAssociados(b.papeis, b.auxiliares);
    const dataSessao = b.date ? new Date(b.date) : existing.date;
    const { rows, texto } = montarParticipacaoETexto(b.papeis, b.auxiliares, mapa, dataSessao);
    Object.assign(data, texto);
    data.participations = { deleteMany: {}, create: rows };
  }
  const session = await prisma.sessionRecord.update({ where: { id: req.params.id }, data, include: participationInclude });
  res.json(session);
});

sessionsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.sessionRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Sessão não encontrada' });
  if (!(await requireCalendarWrite(req, res, existing.calendarId))) return;
  await prisma.sessionRecord.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
