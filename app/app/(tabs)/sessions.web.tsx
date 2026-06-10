import { useEffect, useState } from 'react';
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

// ─── Session Form Modal ──────────────────────────────────────────────────────

function SessionModal({ sess, calendars, onClose, onSaved }: any) {
  const isNew = !sess?.id;
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState<any>({
    calendarId: calendars.find((c:any) => c.type==='INSTITUCIONAL')?.id || calendars[0]?.id || '',
    type: 'ESCALA', title: '', date: today,
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function SessionsWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [filter, setFilter] = useState('');

  async function load() {
    const [all, st, cals] = await Promise.all([
      api('/sessions'), api('/sessions/stats'), api('/calendars'),
    ]).catch(() => [[],[],[]]);
    setSessions(all); setStats(st); setCalendars(cals);
  }

  useEffect(() => { load(); }, []);

  const shown = sessions.filter(s =>
    !filter || s.type===filter || s.dirigente?.toLowerCase().includes(filter.toLowerCase()) || s.title?.toLowerCase().includes(filter.toLowerCase())
  );

  function onSaved() { setModal(null); load(); }

  const totalCopos = (stats?.coposSimples||0) + (stats?.coposDuplos||0)*2 + (stats?.coposCriancas||0);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🌿 Controle de Sessões</h1>
        <button className="btn btn-gold" onClick={() => setModal({})}>+ Nova Sessão</button>
      </div>

      {/* Stats */}
      {stats && (
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
          <span>🔍</span>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar por tipo, dirigente..." />
        </div>
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

      {modal && (
        <SessionModal
          sess={modal.id ? modal : null}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
