import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { injectWebCss, fmtDate } from '../../src/webCss';

const TYPES = [
  { key: 'ESCALA',           label: 'Escala' },
  { key: 'ESCALA_ANUAL',     label: 'Escala Anual' },
  { key: 'INSTRUTIVA',       label: 'Instrutiva' },
  { key: 'EXTRA',            label: 'Extra' },
  { key: 'ADVENTICIOS',      label: 'Adventícios' },
  { key: 'DIRECAO',          label: 'Direção' },
  { key: 'QUADRO_DE_MESTRES',label: 'Quadro de Mestres' },
  { key: 'COMEMORATIVA',     label: 'Comemorativa' },
  { key: 'OUTRA',            label: 'Outra' },
];

const TYPE_COLORS: Record<string,string> = {
  ESCALA:'#0F5C2E', ESCALA_ANUAL:'#0d4d2e', INSTRUTIVA:'#0a6640',
  EXTRA:'#1a7a4a', ADVENTICIOS:'#2d5016', DIRECAO:'#0F2A4A',
  QUADRO_DE_MESTRES:'#1a3a5c', COMEMORATIVA:'#C9952A', OUTRA:'#6b7280',
};

function typeLabel(k: string) { return TYPES.find(t=>t.key===k)?.label ?? k; }
function typeColor(k: string) { return TYPE_COLORS[k] ?? '#6b7280'; }

// Conectores que permanecem minúsculos em nomes próprios (pt-BR).
const NAME_CONNECTORS = new Set(['de','da','do','das','dos','e','di','du','del','la','das','dello']);
// Formata um nome em caixa Alta-e-baixa (Title Case), mantendo conectores minúsculos.
function titleCaseNome(s?: string | null): string {
  if (!s) return '';
  return String(s).trim().toLowerCase().split(/\s+/).map((w, i) =>
    i > 0 && NAME_CONNECTORS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

// Totaliza uma lista de sessões (sessões, coado, retorno e copos equivalentes).
function computeStats(list: any[]) {
  const sum = (k: string) => list.reduce((a, s) => a + (Number(s[k]) || 0), 0);
  const coposSimples = sum('coposSimples'), coposDuplos = sum('coposDuplos'), coposCriancas = sum('coposCriancas');
  return {
    totalSessoes: list.length,
    coadoLitros: sum('coadoLitros'),
    retornoLitros: sum('retornoLitros'),
    coposSimples, coposDuplos, coposCriancas,
    totalCopos: coposSimples + coposDuplos * 2 + coposCriancas,
  };
}

// Métricas exibidas na comparação entre anos.
const CMP_METRICS = [
  { label: 'Total de Sessões', get: (s: any) => s.totalSessoes, fmt: (v: number) => String(v) },
  { label: 'Vegetal Coado', get: (s: any) => s.coadoLitros, fmt: (v: number) => `${v.toFixed(1)}L` },
  { label: 'Retorno', get: (s: any) => s.retornoLitros, fmt: (v: number) => `${v.toFixed(1)}L` },
  { label: 'Copos (equiv.)', get: (s: any) => s.totalCopos, fmt: (v: number) => String(v) },
];

// ─── Session Form Modal ──────────────────────────────────────────────────────

function SessionModal({ sess, calendars, onClose, onSaved }: any) {
  const isNew = !sess?.id;
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState<any>({
    calendarId: calendars.find((c:any) => c.type==='INSTITUCIONAL')?.id || calendars[0]?.id || '',
    type: 'ESCALA', title: '',
    dirigente:'', assistente:'', auxAssistente:'', som:'',
    leituraDocumentos:'', explanacao:'', vegetalDescricao:'',
    coadoLitros:'', comungadoLitros:'', retornoLitros:'',
    coposSimples:'', coposDuplos:'', coposCriancas:'', repeticoes:'', observacoes:'',
    ...(sess || {}),
    date: sess?.date ? new Date(sess.date).toISOString().slice(0,10) : today,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }
  function num(v: any) { return v===''||v==null ? null : String(v).replace(',','.'); }

  async function save() {
    if (!form.date) { setError('Data é obrigatória'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        ...form, date: `${form.date}T12:00:00`,
        coadoLitros: num(form.coadoLitros), comungadoLitros: num(form.comungadoLitros),
        retornoLitros: num(form.retornoLitros), coposSimples: num(form.coposSimples),
        coposDuplos: num(form.coposDuplos), coposCriancas: num(form.coposCriancas),
        repeticoes: num(form.repeticoes),
      };
      if (isNew) await api('/sessions', { method: 'POST', body });
      else       await api(`/sessions/${sess.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Excluir esta sessão?')) return;
    await api(`/sessions/${sess.id}`, { method: 'DELETE' });
    onSaved();
  }

  const field = (label: string, key: string, type?: string, placeholder?: string) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type||'text'} value={form[key]??''} onChange={set(key)} placeholder={placeholder||''} />
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Registrar Sessão' : 'Editar Sessão'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Agenda</label>
              <select className="form-select" value={form.calendarId} onChange={set('calendarId')}>
                {calendars.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.type} onChange={set('type')}>
                {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            {field('Data *','date','date')}
            {field('Título (opcional)','title','text','Ex.: Sessão de Reis')}
          </div>

          <div className="divider" />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Ministração</div>

          <div className="form-row">
            {field('Mestre Dirigente','dirigente')}
            {field('Mestre Assistente','assistente')}
          </div>
          {field('Auxiliares do Assistente','auxAssistente')}
          <div className="form-row">
            {field('Som','som')}
            {field('Leitura dos Documentos','leituraDocumentos')}
          </div>
          {field('Explanação','explanacao')}

          <div className="divider" />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Vegetal</div>

          <div className="form-group">
            <label className="form-label">Descrição do Vegetal</label>
            <textarea className="form-textarea" value={form.vegetalDescricao||''} onChange={set('vegetalDescricao')} rows={2} />
          </div>

          <div className="form-row">
            {field('Coado (L)','coadoLitros','number')}
            {field('Comungado (L)','comungadoLitros','number')}
          </div>
          <div className="form-row">
            {field('Retorno (L)','retornoLitros','number')}
            <div />
          </div>

          <div className="divider" />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Copos</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {field('Simples','coposSimples','number')}
            {field('Duplos','coposDuplos','number')}
            {field('Crianças','coposCriancas','number')}
            {field('Repetições','repeticoes','number')}
          </div>

          <div className="divider" />
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observacoes||''} onChange={set('observacoes')} />
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && <button className="btn btn-danger btn-sm" onClick={remove}>Excluir</button>}
          <span style={{ flex:1 }} />
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Levantamentos de estoque ─────────────────────────────────────────────────

// Autocomplete de associados. mode="single" (M.Assistente) ou "multi" (auxiliares).
// grau opcional filtra por grau (ex.: "QM" para M.Assistente). value: id (single) ou ids[] (multi).
function AssociadoPicker({ mode='single', grau, value, onChange, placeholder }: any) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [cache, setCache] = useState<Record<string, any>>({}); // id → associado (p/ exibir selecionados)

  // Busca com debounce ao digitar.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ ativo: 'true', pageSize: '20' });
      if (q.trim()) params.set('q', q.trim());
      if (grau) params.set('grau', grau);
      try {
        const list = await api(`/associados?${params.toString()}`);
        if (!alive) return;
        setOpts(list || []);
        setCache((c) => { const n = { ...c }; for (const a of list || []) n[a.id] = a; return n; });
      } catch { if (alive) setOpts([]); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, grau]);

  const selectedIds: string[] = mode === 'multi' ? (value || []) : (value ? [value] : []);
  const nameOf = (id: string) => cache[id]?.nome || '…';

  function pick(a: any) {
    setCache((c) => ({ ...c, [a.id]: a }));
    if (mode === 'multi') {
      if (!selectedIds.includes(a.id)) onChange([...selectedIds, a.id]);
      setQ('');
    } else {
      onChange(a.id); setQ(''); setOpen(false);
    }
  }
  function unpick(id: string) {
    if (mode === 'multi') onChange(selectedIds.filter((x) => x !== id));
    else onChange(null);
  }

  // Pré-carrega nomes dos ids já selecionados que não estão em cache.
  useEffect(() => {
    const missing = selectedIds.filter((id) => !cache[id]);
    if (!missing.length) return;
    (async () => {
      for (const id of missing) {
        try { const a = await api(`/associados/${id}`).catch(() => null); if (a) setCache((c) => ({ ...c, [id]: a })); } catch {}
      }
    })();
  }, [selectedIds.join(',')]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Chips dos selecionados */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {selectedIds.map((id) => (
            <span key={id} className="pill" style={{ background: '#0F5C2E18', color: '#0F5C2E', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {titleCaseNome(nameOf(id))}
              <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => unpick(id)}>✕</span>
            </span>
          ))}
        </div>
      )}
      {(mode === 'multi' || selectedIds.length === 0) && (
        <input
          className="form-input"
          value={q}
          placeholder={placeholder || 'Buscar associado…'}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      )}
      {open && opts.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,.12)' }}>
          {opts.filter((a) => !selectedIds.includes(a.id)).map((a) => (
            <div key={a.id} onMouseDown={() => pick(a)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                 onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                 onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
              <span>{titleCaseNome(a.nome)}</span>
              {a.grau && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{a.grau}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LOCAIS = [
  { v: 'GELADEIRA', label: 'Geladeira' },
  { v: 'FORA', label: 'Fora (ambiente)' },
  { v: 'OUTRO', label: 'Outro' },
];

const emptyItem = () => ({ nome: '', litros: '', local: 'GELADEIRA', origem: '', notas: '' });

function LevantamentoModal({ lev, onClose, onSaved }: any) {
  const isNew = !lev?.id;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({
    data: lev?.data ? String(lev.data).slice(0, 10) : today,
    assistenteId: lev?.assistente?.id || lev?.assistenteId || null,
    auxiliarIds: (lev?.auxiliares || []).map((x: any) => x.associado?.id || x.associadoId).filter(Boolean),
    notas: lev?.notas || '',
    itens: lev?.itens?.length ? lev.itens.map((i: any) => ({ ...i, litros: String(i.litros) })) : [emptyItem()],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setItem = (idx: number, k: string, v: any) =>
    setForm((f: any) => ({ ...f, itens: f.itens.map((it: any, i: number) => (i === idx ? { ...it, [k]: v } : it)) }));
  const addItem = () => setForm((f: any) => ({ ...f, itens: [...f.itens, emptyItem()] }));
  const removeItem = (idx: number) => setForm((f: any) => ({ ...f, itens: f.itens.filter((_: any, i: number) => i !== idx) }));

  const total = form.itens.reduce((s: number, it: any) => s + (parseFloat(String(it.litros).replace(',', '.')) || 0), 0);

  async function save() {
    const itens = form.itens.filter((it: any) => it.nome.trim() && it.litros !== '');
    if (!itens.length) { setError('Adicione ao menos um item com nome e litros.'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        data: form.data,
        assistenteId: form.assistenteId || null,
        auxiliarIds: form.auxiliarIds,
        notas: form.notas || null,
        itens: itens.map((it: any) => ({ ...it, litros: parseFloat(String(it.litros).replace(',', '.')) })),
      };
      if (isNew) await api('/levantamentos', { method: 'POST', body });
      else await api(`/levantamentos/${lev.id}`, { method: 'PUT', body });
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Excluir este levantamento e todos os seus itens?')) return;
    await api(`/levantamentos/${lev.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Novo Levantamento' : 'Editar Levantamento'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.data} onChange={(e) => setForm((f: any) => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">M. Assistente (grau QM)</label>
              <AssociadoPicker mode="single" grau="QM" value={form.assistenteId}
                onChange={(v: any) => setForm((f: any) => ({ ...f, assistenteId: v }))} placeholder="Buscar M. Assistente…" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Auxiliares</label>
            <AssociadoPicker mode="multi" value={form.auxiliarIds}
              onChange={(v: any) => setForm((f: any) => ({ ...f, auxiliarIds: v }))} placeholder="Buscar auxiliares…" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Itens do levantamento</label>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total: <strong style={{ color: '#0F5C2E' }}>{total.toFixed(1)}L</strong></span>
          </div>
          {form.itens.map((it: any, idx: number) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '2 1 180px', margin: 0 }}>
                  <label className="form-label">Nome / Descrição</label>
                  <input className="form-input" value={it.nome} onChange={(e) => setItem(idx, 'nome', e.target.value)} placeholder="Ex.: Tucunacá Baliza" />
                </div>
                <div className="form-group" style={{ flex: '0 1 90px', margin: 0 }}>
                  <label className="form-label">Litros</label>
                  <input className="form-input" type="number" step="0.1" value={it.litros} onChange={(e) => setItem(idx, 'litros', e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '0 1 130px', margin: 0 }}>
                  <label className="form-label">Local</label>
                  <select className="form-select" value={it.local} onChange={(e) => setItem(idx, 'local', e.target.value)}>
                    {LOCAIS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
                  </select>
                </div>
                <button className="btn btn-danger btn-sm" style={{ marginBottom: 1 }} onClick={() => removeItem(idx)} disabled={form.itens.length === 1}>✕</button>
              </div>
              <div className="form-row" style={{ marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Origem</label>
                  <input className="form-input" value={it.origem || ''} onChange={(e) => setItem(idx, 'origem', e.target.value)} placeholder="Ex.: NRI, Itinga…" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Notas</label>
                  <input className="form-input" value={it.notas || ''} onChange={(e) => setItem(idx, 'notas', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-outline btn-sm" onClick={addItem}>+ Adicionar item</button>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Observações do levantamento</label>
            <textarea className="form-textarea" value={form.notas} onChange={(e) => setForm((f: any) => ({ ...f, notas: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && <button className="btn btn-danger btn-sm" onClick={remove}>Excluir</button>}
          <span style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function SessionsWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [sessions, setSessions] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const nowYear = new Date().getFullYear();
  const [period, setPeriod] = useState('all'); // 'all' | 'month' | '<ano>'
  const [compare, setCompare] = useState(false);
  const [yearA, setYearA] = useState(nowYear);
  const [yearB, setYearB] = useState(nowYear - 1);
  const [estoque, setEstoque] = useState<any>({ atual: null, historico: [] });
  const [levModal, setLevModal] = useState<any>(null);

  // FAB global: ?new=<ts> abre o modal de nova sessão
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { if (newParam) setModal({}); }, [newParam]);

  async function load() {
    const [all, cals, est] = await Promise.all([
      api('/sessions'), api('/calendars'), api('/levantamentos'),
    ]).catch(() => [[],[],{ atual: null, historico: [] }]);
    setSessions(all); setCalendars(cals); setEstoque(est);
  }

  useEffect(() => { load(); }, []);

  // Opções de ano: atual + 3 anteriores.
  const yearOptions = [nowYear, nowYear - 1, nowYear - 2, nowYear - 3];
  const yearOf = (s: any) => new Date(s.date).getFullYear();

  // Filtro de tipo/busca (independente de período).
  const matchesFilter = (s: any) =>
    !filter || s.type===filter || s.dirigente?.toLowerCase().includes(filter.toLowerCase()) || s.title?.toLowerCase().includes(filter.toLowerCase());

  function inPeriod(s: any) {
    if (period === 'all') return true;
    const d = new Date(s.date);
    if (Number.isNaN(d.getTime())) return false;
    if (period === 'month') return d.getFullYear() === nowYear && d.getMonth() === new Date().getMonth();
    return d.getFullYear() === Number(period); // ano específico
  }

  // Tabela: no modo comparar mostra os dois anos; senão segue o período.
  const shown = (compare
    ? sessions.filter(s => yearOf(s) === yearA || yearOf(s) === yearB)
    : sessions.filter(inPeriod)
  ).filter(matchesFilter);

  function onSaved() { setModal(null); setLevModal(null); load(); }

  // Totais (modo normal sobre `shown`; modo comparar = um conjunto por ano, sempre respeitando tipo/busca).
  const stats = computeStats(shown);
  const statsForYear = (y: number) => computeStats(sessions.filter(s => yearOf(s) === y).filter(matchesFilter));
  const statsA = statsForYear(yearA);
  const statsB = statsForYear(yearB);
  const totalCopos = stats.totalCopos;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🌿 Controle de Sessões</h1>
        <button className="btn btn-gold" onClick={() => setModal({})}>+ Nova Sessão</button>
      </div>

      {/* Stats */}
      {compare ? (
        <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 16 }}>
          <table className="sess-table">
            <thead>
              <tr><th>Métrica</th><th>{yearA}</th><th>{yearB}</th><th>Δ ({yearA}−{yearB})</th></tr>
            </thead>
            <tbody>
              {CMP_METRICS.map(m => {
                const a = m.get(statsA), b = m.get(statsB), d = a - b;
                const color = d > 0 ? '#0F5C2E' : d < 0 ? '#b91c1c' : 'var(--muted)';
                return (
                  <tr key={m.label}>
                    <td style={{ fontWeight: 600 }}>{m.label}</td>
                    <td>{m.fmt(a)}</td>
                    <td>{m.fmt(b)}</td>
                    <td style={{ color, fontWeight: 600 }}>{d > 0 ? '+' : ''}{m.fmt(d)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stat-grid">
          <div className="stat-card" style={{ borderLeftColor: '#0F5C2E' }}>
            <div className="stat-label">Total de Sessões</div>
            <div className="stat-value">{stats.totalSessoes}</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#0a6640' }}>
            <div className="stat-label">Vegetal Coado</div>
            <div className="stat-value">{(stats.coadoLitros||0).toFixed(1)}L</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#1a7a4a' }}>
            <div className="stat-label">Retorno</div>
            <div className="stat-value">{(stats.retornoLitros||0).toFixed(1)}L</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#C9952A' }}>
            <div className="stat-label">Copos (total equiv.)</div>
            <div className="stat-value">{totalCopos}</div>
            <div className="stat-sub">{stats.coposSimples}s · {stats.coposDuplos}d · {stats.coposCriancas}c</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ minWidth: 200 }}>
          <span><Ionicons name="search-outline" size={16} color="#52606D" /></span>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar por tipo, dirigente..." />
        </div>
        {compare ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select className="form-select" style={{ width: 'auto' }} value={yearA} onChange={e=>setYearA(Number(e.target.value))} title="Ano A">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>vs</span>
            <select className="form-select" style={{ width: 'auto' }} value={yearB} onChange={e=>setYearB(Number(e.target.value))} title="Ano B">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        ) : (
          <select className="form-select" style={{ width: 'auto' }} value={period} onChange={e=>setPeriod(e.target.value)} title="Período">
            <option value="all">Todo o período</option>
            <option value="month">Este mês</option>
            {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        )}
        <button className={`btn btn-sm ${compare ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCompare(c => !c)}>
          {compare ? '✓ Comparando anos' : 'Comparar anos'}
        </button>
        <div className="view-tabs">
          <button className={`view-tab${!filter?' active':''}`} onClick={()=>setFilter('')}>Todas</button>
          {TYPES.map(t => (
            <button key={t.key} className={`view-tab${filter===t.key?' active':''}`} onClick={()=>setFilter(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="sess-table">
          <thead>
            <tr>
              <th>Data</th><th>Tipo</th><th>Título</th><th>Dirigente</th>
              <th>Assistente</th><th>Coado</th><th>Retorno</th><th>Copos</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>Nenhuma sessão registrada</td></tr>
            )}
            {shown.map(s => (
              <tr key={s.id} onClick={() => setModal(s)}>
                <td style={{ whiteSpace:'nowrap' }}>{fmtDate(s.date)}</td>
                <td>
                  <span className="pill" style={{ background: typeColor(s.type)+'22', color: typeColor(s.type) }}>
                    {typeLabel(s.type)}
                  </span>
                </td>
                <td>{s.title||'—'}</td>
                <td>{s.dirigente||'—'}</td>
                <td>{s.assistente||'—'}</td>
                <td>{s.coadoLitros!=null ? `${s.coadoLitros}L` : '—'}</td>
                <td>{s.retornoLitros!=null ? `${s.retornoLitros}L` : '—'}</td>
                <td>
                  {[s.coposSimples&&`${s.coposSimples}s`,s.coposDuplos&&`${s.coposDuplos}d`,s.coposCriancas&&`${s.coposCriancas}c`].filter(Boolean).join(' ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Estoque de Vegetal — por levantamentos */}
      <div className="section-label" style={{ marginTop: 24 }}>Estoque de Vegetal</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>
              Total em estoque {estoque.atual ? `(levantamento de ${fmtDate(estoque.atual.data)})` : ''}
            </div>
            <div style={{ fontSize:28, fontWeight:700, color:'#0F5C2E' }}>{(estoque.atual?.total || 0).toFixed(1)}L</div>
            {estoque.atual?.assistente && (
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                <strong>M. Assistente:</strong> {(estoque.atual.assistente.nome || '').toUpperCase()}
                {estoque.atual.auxiliares?.length ? ` · Aux.: ${estoque.atual.auxiliares.map((x:any)=>titleCaseNome(x.associado?.nome)).filter(Boolean).join(', ')}` : ''}
              </div>
            )}
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => setLevModal({})}>+ Novo Levantamento</button>
        </div>
        {!estoque.atual
          ? <div style={{ color:'var(--muted)', fontSize:13 }}>Nenhum levantamento registrado. Clique em “+ Novo Levantamento” para começar.</div>
          : (
            <>
              {estoque.atual.itens?.length === 0
                ? <div style={{ color:'var(--muted)', fontSize:13 }}>Levantamento sem itens.</div>
                : estoque.atual.itens?.map((l: any) => (
                    <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:'1px solid var(--border)' }}>
                      <Ionicons name={l.local==='GELADEIRA'?'snow-outline':'thermometer-outline'} size={18} color={l.local==='GELADEIRA'?'#0369A1':'#D67708'} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{l.nome}</div>
                        {l.origem && <div style={{ fontSize:12, color:'var(--muted)' }}>{l.origem}</div>}
                      </div>
                      <div style={{ fontWeight:700, color:'#0F5C2E', fontSize:14 }}>{l.litros}L</div>
                      <span className="pill" style={{ background:'#0F5C2E22', color:'#0F5C2E', fontSize:10 }}>{l.local}</span>
                    </div>
                  ))
              }
              <div style={{ marginTop:12, textAlign:'right' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setLevModal(estoque.atual)}>Editar levantamento atual</button>
              </div>
            </>
          )
        }
      </div>

      {/* Histórico de levantamentos */}
      {estoque.historico?.length > 0 && (
        <>
          <div className="section-label">Histórico de levantamentos</div>
          <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 24 }}>
            <table className="sess-table">
              <thead>
                <tr><th>Data</th><th>M. Assistente</th><th>Auxiliares</th><th>Itens</th><th>Total</th></tr>
              </thead>
              <tbody>
                {estoque.historico.map((l: any) => (
                  <tr key={l.id} onClick={() => setLevModal(l)}>
                    <td style={{ whiteSpace:'nowrap' }}>{fmtDate(l.data)}</td>
                    <td>{l.assistente ? (l.assistente.nome || '').toUpperCase() : '—'}</td>
                    <td>{l.auxiliares?.map((x:any)=>titleCaseNome(x.associado?.nome)).filter(Boolean).join(', ') || '—'}</td>
                    <td>{l.itens?.length || 0}</td>
                    <td style={{ fontWeight:700, color:'#0F5C2E' }}>{(l.total||0).toFixed(1)}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal && (
        <SessionModal
          sess={modal.id ? modal : null}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {levModal !== null && <LevantamentoModal lev={levModal?.id ? levModal : null} onClose={() => setLevModal(null)} onSaved={onSaved} />}
    </div>
  );
}
