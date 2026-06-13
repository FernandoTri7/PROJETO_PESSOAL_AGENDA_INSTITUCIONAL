import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { injectWebCss, MONTHS_PT } from '../../src/webCss';
import { loadPrefs, getDefaultView, setDefaultView } from '../../src/prefs';

const GROUP_COLORS: Record<string,string> = {
  CRIANCA: '#F5A018', JOVEM: '#22C55E', ADULTO: '#0F5C5E',
};
const GROUP_LABELS: Record<string,string> = {
  CRIANCA: 'Criança', JOVEM: 'Jovem', ADULTO: 'Adulto',
};
const GROUP_ICONS: Record<string,string> = {
  CRIANCA: 'happy-outline', JOVEM: 'person-outline', ADULTO: 'person-circle-outline',
};

function BdModal({ bd, calendars, onClose, onSaved }: any) {
  const isNew = !bd?.id;
  const [form, setForm] = useState<any>({
    calendarId: calendars[0]?.id || '', name: '', phone: '', notes: '',
    ...(bd||{}),
    birthDate: bd?.birthDate ? new Date(bd.birthDate).toISOString().slice(0,10) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }

  async function save() {
    if (!form.name.trim() || !form.birthDate) { setError('Nome e data são obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const body = { calendarId: form.calendarId, name: form.name.trim(), birthDate: form.birthDate, phone: form.phone||null, notes: form.notes||null };
      if (isNew) await api('/birthdays', { method: 'POST', body });
      else       await api(`/birthdays/${bd.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Excluir este aniversário?')) return;
    await api(`/birthdays/${bd.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Novo Aniversário' : 'Editar Aniversário'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data de Nascimento *</label>
              <input className="form-input" type="date" value={form.birthDate} onChange={set('birthDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.phone||''} onChange={set('phone')} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Agenda</label>
            <select className="form-select" value={form.calendarId} onChange={set('calendarId')}>
              {calendars.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.notes||''} onChange={set('notes')} rows={2} />
          </div>
          <div className="form-hint" style={{ marginTop: 6 }}>
            A classificação etária (Criança 0–11, Jovem 12–17, Adulto 18+) é calculada automaticamente.
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

function nextBdStr(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const nb = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (nb < today) nb.setFullYear(today.getFullYear()+1);
  const diff = Math.round((nb.getTime()-today.getTime())/(1000*60*60*24));
  if (diff === 0) return 'Hoje! 🎉';
  if (diff === 1) return 'Amanhã!';
  if (diff <= 7)  return `em ${diff} dias`;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

export default function BirthdaysWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [filter, setFilter] = useState<'TODOS'|'CRIANCA'|'JOVEM'|'ADULTO'>('TODOS');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'lista'|'mensal'|'categoria'>(() => getDefaultView('birthdays', 'lista') as any);

  // FAB global: ?new=<ts> abre o modal de novo aniversário
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { if (newParam) setModal({}); }, [newParam]);

  async function load() {
    const [bds, cals] = await Promise.all([api('/birthdays'), api('/calendars')]).catch(()=>[[],[]]);
    setBirthdays(bds); setCalendars(cals);
  }
  useEffect(() => { load(); loadPrefs().then(() => setView(getDefaultView('birthdays', 'lista') as any)); }, []);

  function changeView(v: 'lista'|'mensal'|'categoria') { setView(v); setDefaultView('birthdays', v); }

  const shown = birthdays.filter(b =>
    (filter==='TODOS' || b.group===filter) &&
    (!search || b.name.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = { CRIANCA: birthdays.filter(b=>b.group==='CRIANCA').length, JOVEM: birthdays.filter(b=>b.group==='JOVEM').length, ADULTO: birthdays.filter(b=>b.group==='ADULTO').length };

  function onSaved() { setModal(null); load(); }

  const renderCard = (b: any) => {
    const color = GROUP_COLORS[b.group] || '#9ca3af';
    return (
      <div key={b.id} className="bd-card" onClick={() => setModal(b)}>
        <div className="bd-avatar" style={{ background: color+'22' }}>
          <Ionicons name={(GROUP_ICONS[b.group] || 'person') as any} size={20} color={color} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="bd-name">{b.name}</div>
          <div className="bd-info">{b.age} anos · {GROUP_LABELS[b.group] || b.group}</div>
          <div style={{ fontSize:11, marginTop:3 }}>
            <span style={{ color: b.daysUntil===0 ? '#ef4444' : b.daysUntil<=7 ? '#f59e0b' : 'var(--muted)' }}>🎂 {nextBdStr(b.birthDate)}</span>
            {b.phone && <span style={{ color:'var(--muted)', marginLeft:8 }}>📞 {b.phone}</span>}
          </div>
        </div>
        <span className="pill" style={{ background: color+'22', color, flexShrink:0 }}>{GROUP_LABELS[b.group]}</span>
      </div>
    );
  };

  // Agrupamentos para as visões Mensal (por mês de nascimento) e Categoria (faixa etária).
  const byMonth = MONTHS_PT
    .map((label: string, i: number) => ({ label, items: shown.filter(b => new Date(b.birthDate).getMonth() === i).sort((a,b)=> new Date(a.birthDate).getDate() - new Date(b.birthDate).getDate()) }))
    .filter(g => g.items.length);
  const byGroup = (['CRIANCA','JOVEM','ADULTO'] as const)
    .map(g => ({ key: g, label: GROUP_LABELS[g], items: shown.filter(b => b.group === g) }))
    .filter(g => g.items.length);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🎂 Aniversários</h1>
        <button className="btn btn-gold" onClick={() => setModal({})}>+ Novo</button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{birthdays.length}</div>
        </div>
        {(['CRIANCA','JOVEM','ADULTO'] as const).map(g => (
          <div key={g} className="stat-card" style={{ borderLeftColor: GROUP_COLORS[g] }}>
            <div className="stat-label"><Ionicons name={GROUP_ICONS[g] as any} size={12} /> {GROUP_LABELS[g]}s</div>
            <div className="stat-value" style={{ color: GROUP_COLORS[g] }}>{counts[g]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div className="search-wrap">
          <span><Ionicons name="search-outline" size={16} color="#52606D" /></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome..." />
        </div>
        <div className="view-tabs">
          <button className={`view-tab${filter==='TODOS'?' active':''}`} onClick={()=>setFilter('TODOS')}>Todos</button>
          {(['CRIANCA','JOVEM','ADULTO'] as const).map(g => (
            <button key={g} className={`view-tab${filter===g?' active':''}`} onClick={()=>setFilter(g)} style={filter===g?{color:GROUP_COLORS[g]}:{}}>
              <Ionicons name={GROUP_ICONS[g] as any} size={12} /> {GROUP_LABELS[g]}s
            </button>
          ))}
        </div>
      </div>

      {/* Visão (layout) — preferência lembrada por usuário */}
      <div className="view-tabs" style={{ marginBottom: 16 }}>
        {([['lista','Lista'],['mensal','Mensal'],['categoria','Categoria']] as const).map(([v, label]) => (
          <button key={v} className={`view-tab${view===v?' active':''}`} onClick={() => changeView(v)}>{label}</button>
        ))}
      </div>

      {/* Conteúdo conforme a visão */}
      {shown.length === 0
        ? <div className="empty"><div className="empty-icon"><Ionicons name="gift-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Nenhum aniversário encontrado</div></div>
        : view === 'lista'
          ? <div className="bd-grid">{shown.map(renderCard)}</div>
          : view === 'mensal'
            ? <div>{byMonth.map(g => (
                <div key={g.label} style={{ marginBottom: 18 }}>
                  <div className="section-label" style={{ marginBottom: 8 }}>{g.label} · {g.items.length}</div>
                  <div className="bd-grid">{g.items.map(renderCard)}</div>
                </div>
              ))}</div>
            : <div>{byGroup.map(g => (
                <div key={g.key} style={{ marginBottom: 18 }}>
                  <div className="section-label" style={{ marginBottom: 8 }}>{g.label}s · {g.items.length}</div>
                  <div className="bd-grid">{g.items.map(renderCard)}</div>
                </div>
              ))}</div>
      }

      {modal && (
        <BdModal
          bd={modal.id ? modal : null}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
