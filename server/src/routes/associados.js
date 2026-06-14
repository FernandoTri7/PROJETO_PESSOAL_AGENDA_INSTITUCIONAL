import { Router } from 'express';
import express from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../lib/auth.js';
import { validateBody } from '../lib/validate.js';
import { associadoCreateSchema, associadoUpdateSchema } from '../lib/schemas.js';
import { soDigitos, validarCpf } from '../lib/documento.js';
import { parsePagination, setPaginationHeaders } from '../lib/pagination.js';

export const associadosRouter = Router();

// Cadastro é ativo institucional: leitura para qualquer autenticado (autocomplete no estoque);
// escrita (criar/editar/excluir/importar) restrita a ADMIN/GESTOR.
const canWrite = requireRole('ADMIN', 'GESTOR');

// ── Helpers ──
const norm = (s) =>
  String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');

const cpfDigits = (v) => {
  const d = soDigitos(v);
  return d.length === 11 ? d : null;
};

// Converte "dd/mm/aaaa" (ou ISO) em Date; null se vazio/ inválido.
function parseNascimento(v) {
  if (!v) return null;
  const s = String(v).trim();
  // dd/mm/aaaa (planilha) — sempre data local.
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // yyyy-mm-dd (input HTML) — interpretar como data LOCAL (evita -1 dia por fuso).
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const intOrNull = (v) => {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
};

// Texto: planilhas podem trazer números (ex.: celular só-dígitos) — sempre coage para String/null.
const str = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

// Monta o registro a salvar a partir de um corpo/linha já com chaves do modelo.
function buildData(b) {
  const nascimento = b.nascimento ? parseNascimento(b.nascimento) : null;
  // Dia/mês: usa os informados; se ausentes e houver data de nascimento, deriva dela.
  let diaNasc = b.diaNasc != null && b.diaNasc !== '' ? intOrNull(b.diaNasc) : null;
  let mesNasc = b.mesNasc != null && b.mesNasc !== '' ? intOrNull(b.mesNasc) : null;
  if (nascimento && diaNasc == null) diaNasc = nascimento.getDate();
  if (nascimento && mesNasc == null) mesNasc = nascimento.getMonth() + 1;
  return {
    nome: str(b.nome),
    grau: str(b.grau),
    diaNasc,
    mesNasc,
    nascimento,
    cpf: cpfDigits(b.cpf),
    status: str(b.status),
    celular: str(b.celular),
    residencial: str(b.residencial),
    email: str(b.email),
    emailAlt: str(b.emailAlt),
    endResidencial: str(b.endResidencial),
    endComercial: str(b.endComercial),
    endOutro: str(b.endOutro),
    ativo: b.ativo !== undefined ? !!b.ativo : true,
  };
}

// GET /api/associados?q=&status=&ativo=&page=&pageSize=
associadosRouter.get('/', async (req, res) => {
  const where = {};
  if (req.query.q) {
    const q = String(req.query.q);
    where.OR = [{ nome: { contains: q } }, { email: { contains: q } }, { cpf: { contains: soDigitos(q) || q } }];
  }
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.grau) where.grau = String(req.query.grau);
  if (req.query.ativo === 'true') where.ativo = true;
  if (req.query.ativo === 'false') where.ativo = false;
  const pg = parsePagination(req.query);
  const [total, associados] = await Promise.all([
    prisma.associado.count({ where }),
    prisma.associado.findMany({ where, orderBy: { nome: 'asc' }, ...(pg.paginated ? { skip: pg.skip, take: pg.take } : {}) }),
  ]);
  setPaginationHeaders(res, { total, ...pg });
  res.json(associados);
});

associadosRouter.post('/', canWrite, validateBody(associadoCreateSchema), async (req, res) => {
  const b = req.body;
  const data = buildData(b);
  if (b.cpf && !data.cpf) return res.status(400).json({ error: 'CPF deve ter 11 dígitos.' });
  if (data.cpf && !validarCpf(data.cpf)) return res.status(400).json({ error: 'CPF inválido.' });
  if (data.cpf) {
    const dup = await prisma.associado.findUnique({ where: { cpf: data.cpf } });
    if (dup) return res.status(409).json({ error: 'Já existe um associado com este CPF.' });
  }
  const a = await prisma.associado.create({ data: { ...data, origem: 'manual' } });
  res.json(a);
});

associadosRouter.put('/:id', canWrite, validateBody(associadoUpdateSchema), async (req, res) => {
  const existing = await prisma.associado.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Associado não encontrado' });
  const b = req.body;
  const data = buildData({ ...existing, ...b });
  if (b.cpf !== undefined && b.cpf && !cpfDigits(b.cpf)) return res.status(400).json({ error: 'CPF deve ter 11 dígitos.' });
  if (data.cpf && !validarCpf(data.cpf)) return res.status(400).json({ error: 'CPF inválido.' });
  if (data.cpf) {
    const dup = await prisma.associado.findUnique({ where: { cpf: data.cpf } });
    if (dup && dup.id !== existing.id) return res.status(409).json({ error: 'Já existe um associado com este CPF.' });
  }
  const a = await prisma.associado.update({ where: { id: req.params.id }, data });
  res.json(a);
});

associadosRouter.delete('/:id', canWrite, async (req, res) => {
  await prisma.associado.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Importação de planilha (.xls/.xlsx/.csv) ──
// Importa só os campos relevantes (nome, grau, CPF, telefone, email) e SÓ associados FREQUENTES.
// Mapeia colunas por nome normalizado (tolerante a acentos/maiúsculas) → upsert por CPF (ou nome).
const COL = {
  nome: ['nome'],
  grau: ['grau'],
  cpf: ['cpf'],
  status: ['status', 'situacao'],
  celular: ['celular', 'telefone celular', 'telefone'],
  residencial: ['residencial', 'telefone residencial', 'fone residencial'],
  email: ['email', 'e-mail'],
};

function mapRow(rowByNormKey) {
  const out = {};
  for (const [field, cands] of Object.entries(COL)) {
    for (const c of cands) {
      if (rowByNormKey[c] !== undefined && String(rowByNormKey[c]).trim() !== '') { out[field] = rowByNormKey[c]; break; }
    }
  }
  return out;
}

associadosRouter.post(
  '/import',
  canWrite,
  express.raw({ type: ['application/octet-stream', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/*'], limit: '20mb' }),
  async (req, res) => {
    const buf = req.body;
    if (!buf || !buf.length) return res.status(400).json({ error: 'Arquivo vazio.' });
    let rows;
    try {
      const wb = XLSX.read(buf, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } catch (e) {
      return res.status(400).json({ error: 'Não foi possível ler a planilha: ' + e.message });
    }

    const summary = { total: rows.length, created: 0, updated: 0, inativados: 0, skipped: 0, naoFrequente: 0, cpfInvalido: 0 };
    // Identificadores vistos nesta planilha (frequentes) — para reconciliar os ausentes.
    const seenCpf = new Set();
    const seenName = new Set();
    for (const raw of rows) {
      // Indexa as colunas por chave normalizada.
      const byKey = {};
      for (const k of Object.keys(raw)) byKey[norm(k)] = raw[k];
      const mapped = mapRow(byKey);
      if (!mapped.nome || !String(mapped.nome).trim()) { summary.skipped++; continue; }
      // Só importa associados FREQUENTES.
      if (norm(mapped.status) !== 'frequente') { summary.naoFrequente++; continue; }

      // Telefone: usa o celular; se vazio, cai para o residencial. Só os 5 campos relevantes.
      const telefone = (mapped.celular && String(mapped.celular).trim()) || mapped.residencial || null;
      const data = buildData({ nome: mapped.nome, grau: mapped.grau, cpf: mapped.cpf, celular: telefone, email: mapped.email, status: 'FREQUENTE' });
      if (mapped.cpf && !data.cpf) summary.cpfInvalido++; // tinha CPF mas não com 11 dígitos
      if (data.cpf && !validarCpf(data.cpf)) summary.cpfInvalido++; // checksum inválido (mantém o dado)

      // Dedupe: por CPF quando houver; senão por nome normalizado.
      let existing = null;
      if (data.cpf) existing = await prisma.associado.findUnique({ where: { cpf: data.cpf } });
      if (!existing) {
        const sameName = await prisma.associado.findMany({ where: { nome: data.nome } });
        existing = sameName.find((a) => norm(a.nome) === norm(data.nome)) || null;
      }
      try {
        // Presente na planilha → ativo (reativa quem havia saído e voltou).
        if (existing) { await prisma.associado.update({ where: { id: existing.id }, data: { ...data, ativo: true, origem: 'import' } }); summary.updated++; }
        else { await prisma.associado.create({ data: { ...data, ativo: true, origem: 'import' } }); summary.created++; }
        if (data.cpf) seenCpf.add(data.cpf);
        seenName.add(norm(data.nome));
      } catch (e) {
        summary.skipped++;
      }
    }

    // Reconciliação: quem estava ativo e NÃO veio na planilha → inativo (provavelmente saiu da ativa).
    const ativos = await prisma.associado.findMany({ where: { ativo: true } });
    const ausentes = ativos.filter((a) => (a.cpf ? !seenCpf.has(a.cpf) : !seenName.has(norm(a.nome))));
    if (ausentes.length) {
      await prisma.associado.updateMany({ where: { id: { in: ausentes.map((a) => a.id) } }, data: { ativo: false } });
      summary.inativados = ausentes.length;
    }
    res.json(summary);
  }
);
