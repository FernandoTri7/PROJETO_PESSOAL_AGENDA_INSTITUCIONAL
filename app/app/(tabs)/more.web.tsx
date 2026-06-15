import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, clearToken } from '../../src/api';
import { loadPrefs, savePrefs, getPrefs } from '../../src/prefs';
import { requestNotificationPermission } from '../../src/notifications';
import { injectWebCss } from '../../src/webCss';

function ShareModal({ cal, onClose, onSaved }: any) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function share() {
    if (!email.trim()) { setError('Email é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      await api(`/calendars/${cal.id}/members`, { method: 'POST', body: { email, role } });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Compartilhar: {cal.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email do usuário</label>
            <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@email.com" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Papel</label>
            <select className="form-select" value={role} onChange={e=>setRole(e.target.value)}>
              <option value="VIEWER">Visualizador</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={share} disabled={saving}>{saving?'Enviando...':'Compartilhar'}</button>
        </div>
      </div>
    </div>
  );
}

function CalModal({ cal, onClose, onSaved }: any) {
  const isNew = !cal?.id;
  const [form, setForm] = useState<any>({ name:'', type:'PESSOAL', color:'#0F2A4A', ...(cal||{}) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }

  async function save() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      if (isNew) await api('/calendars', { method: 'POST', body: form });
      else       await api(`/calendars/${cal.id}`, { method: 'PUT', body: form });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm(`Excluir "${cal.name}"? Todos os eventos serão removidos.`)) return;
    await api(`/calendars/${cal.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Nova Agenda' : 'Editar Agenda'}</h2>
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
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.type} onChange={set('type')}>
                <option value="PESSOAL">Pessoal</option>
                <option value="FAMILIAR">Familiar</option>
                <option value="INSTITUCIONAL">Institucional</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cor</label>
              <input className="form-input" type="color" value={form.color} onChange={set('color')} style={{ height:40, padding:4 }} />
            </div>
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

const SCOPE_LABEL: Record<string, string> = {
  PESSOAL: 'Pessoal', FAMILIAR: 'Familiar', INSTITUCIONAL: 'Institucional', TODAS: 'Todas as agendas',
};

function CategoryModal({ cat, onClose, onSaved }: any) {
  const isNew = !cat?.id;
  const [form, setForm] = useState<any>({ label:'', color:'#0F5C5E', scope:'TODAS', ...(cat||{}) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }

  async function save() {
    if (!form.label.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body = { label: form.label.trim(), color: form.color, scope: form.scope };
      if (isNew) await api('/categories', { method: 'POST', body });
      else       await api(`/categories/${cat.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm(`Excluir definitivamente a categoria "${cat.label}"?\n\nSó é possível se nenhum evento estiver usando. Se estiver em uso, desative-a em vez de excluir.`)) return;
    setError('');
    try {
      await api(`/categories/${cat.id}`, { method: 'DELETE' });
      onSaved();
    } catch (e: any) {
      setError(e.message); // ex.: "Categoria em uso em N evento(s)..."
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Nova Categoria' : 'Editar Categoria'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={form.label} onChange={set('label')} placeholder="Ex.: Reunião" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Agenda (escopo)</label>
              <select className="form-select" value={form.scope} onChange={set('scope')}>
                <option value="TODAS">Todas as agendas</option>
                <option value="PESSOAL">Pessoal</option>
                <option value="FAMILIAR">Familiar</option>
                <option value="INSTITUCIONAL">Institucional</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cor</label>
              <input className="form-input" type="color" value={form.color} onChange={set('color')} style={{ height:40, padding:4 }} />
            </div>
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

// Cadastro de Sessão Anual (recorrente) — nome, dia/mês e tipo (Comemorativa/Extra).
function SessaoAnualModal({ sa, onClose, onSaved }: any) {
  const isNew = !sa?.id;
  const [form, setForm] = useState<any>({ nome: '', dia: '', mes: '', tipo: 'COMEMORATIVA', ...(sa || {}) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({ ...f, [k]: e.target.value })); }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body = { nome: form.nome.trim(), dia: form.dia===''?null:Number(form.dia), mes: form.mes===''?null:Number(form.mes), tipo: form.tipo };
      if (isNew) await api('/sessoes-anuais', { method: 'POST', body });
      else       await api(`/sessoes-anuais/${sa.id}`, { method: 'PUT', body });
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!confirm('Excluir esta sessão anual?')) return;
    await api(`/sessoes-anuais/${sa.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Nova Sessão Anual' : 'Editar Sessão Anual'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Ex.: Dia de Reis" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ width: 90 }}>
              <label className="form-label">Dia</label>
              <input className="form-input" type="number" min={1} max={31} value={form.dia??''} onChange={set('dia')} />
            </div>
            <div className="form-group" style={{ width: 90 }}>
              <label className="form-label">Mês</label>
              <input className="form-input" type="number" min={1} max={12} value={form.mes??''} onChange={set('mes')} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={set('tipo')}>
                <option value="COMEMORATIVA">Anual</option>
                <option value="EXTRA">Extra (ex.: Passagem do Ano)</option>
              </select>
            </div>
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

// Cadastro de Tipo de Sessão — label, cor e ordem (key derivada do nome quando nova).
function TipoSessaoModal({ tipo, onClose, onSaved }: any) {
  const isNew = !tipo?.id;
  const [form, setForm] = useState<any>({ label: '', cor: '#0F5C2E', ordem: '', ...(tipo || {}) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({ ...f, [k]: e.target.value })); }

  async function save() {
    if (!form.label.trim()) { setError('Nome é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body: any = { label: form.label.trim(), cor: form.cor || null, ordem: form.ordem===''?undefined:Number(form.ordem) };
      if (isNew) await api('/tipos-sessao', { method: 'POST', body });
      else       await api(`/tipos-sessao/${tipo.id}`, { method: 'PUT', body });
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!confirm('Excluir este tipo de sessão? Sessões já gravadas mantêm o tipo, mas ele some da lista.')) return;
    await api(`/tipos-sessao/${tipo.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Novo Tipo de Sessão' : 'Editar Tipo de Sessão'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={form.label} onChange={set('label')} placeholder="Ex.: Instrutiva" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ width: 110 }}>
              <label className="form-label">Cor</label>
              <input className="form-input" type="color" value={form.cor||'#0F5C2E'} onChange={set('cor')} style={{ height:40, padding:4 }} />
            </div>
            <div className="form-group" style={{ width: 110 }}>
              <label className="form-label">Ordem</label>
              <input className="form-input" type="number" value={form.ordem??''} onChange={set('ordem')} />
            </div>
            {!isNew && <div className="form-group" style={{ flex:1 }}>
              <label className="form-label">Código</label>
              <input className="form-input" value={form.key||''} disabled style={{ opacity:.7 }} />
            </div>}
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

// Seção recolhível (accordion). Começa fechada por padrão para a página não ficar extensa.
function Section({ title, defaultOpen = false, children }: any) {
  const [open, setOpen] = useState<boolean>(!!defaultOpen);
  return (
    <>
      <div className="section-label" onClick={() => setOpen((o: boolean) => !o)}
           style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={14} />
        {title}
      </div>
      {open && children}
    </>
  );
}

export default function MoreWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [calendars, setCalendars] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [calModal, setCalModal] = useState<any>(null);
  const [shareModal, setShareModal] = useState<any>(null);
  const [catModal, setCatModal] = useState<any>(null);
  const [anuais, setAnuais] = useState<any[]>([]);
  const [saModal, setSaModal] = useState<any>(null);
  const [tiposSessao, setTiposSessao] = useState<any[]>([]);
  const [tipoModal, setTipoModal] = useState<any>(null);
  const [prefs, setPrefs] = useState(getPrefs());
  const [gstatus, setGstatus] = useState<any>({ configured: false, connected: false, email: null });
  const [googleMsg, setGoogleMsg] = useState('');

  async function load() {
    const [cals, categories, an, tp] = await Promise.all([api('/calendars'), api('/categories?all=1'), api('/sessoes-anuais?all=1'), api('/tipos-sessao?all=1')]).catch(()=>[[],[],[],[]]);
    setCalendars(cals); setCats(categories); setAnuais(an || []); setTiposSessao(tp || []);
  }
  useEffect(() => {
    load();
    loadPrefs().then(setPrefs);
    api('/google/status').then(setGstatus).catch(()=>{});
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('google');
      if (q === 'ok') setGoogleMsg('Conta Google conectada com sucesso.');
      else if (q === 'erro') setGoogleMsg('Falha ao conectar a conta Google. Tente novamente.');
    }
  }, []);

  async function connectGoogle() {
    try { const r = await api('/google/auth'); if (typeof window !== 'undefined') window.location.href = r.url; }
    catch (e: any) { alert(e.message); }
  }
  async function disconnectGoogle() {
    await api('/google', { method: 'DELETE' });
    setGstatus(await api('/google/status'));
  }

  async function toggleNotifications(on: boolean) {
    if (on) { const ok = await requestNotificationPermission(); if (!ok) { alert('Permissão de notificação negada pelo navegador.'); return; } }
    setPrefs(await savePrefs({ notificationsEnabled: on }));
  }
  async function toggleInstitutional(on: boolean) {
    await savePrefs({ useInstitutional: on });
    // Recarrega para o menu lateral e os filtros de evento refletirem a mudança.
    if (typeof window !== 'undefined') window.location.reload();
  }
  async function toggleMoon(on: boolean) {
    setPrefs(await savePrefs({ showMoon: on }));
  }
  async function toggleHolidays(on: boolean) {
    setPrefs(await savePrefs({ showHolidays: on }));
  }
  async function setActivationDays(n: number) {
    const days = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 7;
    setPrefs(await savePrefs({ taskActivationDays: days }));
  }

  async function logout() {
    await clearToken();
    router.replace('/login');
  }

  async function toggleCategory(cat: any) {
    await api(`/categories/${cat.id}`, { method: 'PUT', body: { active: !cat.active } });
    load();
  }

  const MES_ABREV = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  async function toggleAnual(sa: any) {
    await api(`/sessoes-anuais/${sa.id}`, { method: 'PUT', body: { ativo: !sa.ativo } });
    load();
  }
  async function toggleTipo(t: any) {
    await api(`/tipos-sessao/${t.id}`, { method: 'PUT', body: { ativo: !t.ativo } });
    load();
  }

  function onSaved() { setCalModal(null); setShareModal(null); setCatModal(null); setSaModal(null); setTipoModal(null); load(); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title" style={{ display:'inline-flex', alignItems:'center', gap:8 }}><Ionicons name="settings-outline" size={20} /> Configurações</h1>
      </div>

      {/* Preferences section */}
      <Section title="Preferências">
      <div className="card" style={{ marginBottom: 24 }}>
        <label style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer' }}>
          <input type="checkbox" checked={prefs.notificationsEnabled} onChange={e => toggleNotifications(e.target.checked)} />
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>Notificações de eventos</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Avisa antes dos eventos (com base nos lembretes), enquanto o app está aberto.</div>
          </div>
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer', borderTop:'1px solid var(--border)' }}>
          <input type="checkbox" checked={prefs.useInstitutional} onChange={e => toggleInstitutional(e.target.checked)} />
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>Usar agenda institucional</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Quando desligado, oculta a aba Sessões e os eventos das agendas institucionais.</div>
          </div>
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer', borderTop:'1px solid var(--border)' }}>
          <input type="checkbox" checked={prefs.showMoon} onChange={e => toggleMoon(e.target.checked)} />
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>Mostrar fase da lua 🌙</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Exibe o ícone da fase da lua em cada dia da visão mensal da agenda.</div>
          </div>
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer', borderTop:'1px solid var(--border)' }}>
          <input type="checkbox" checked={prefs.showHolidays} onChange={e => toggleHolidays(e.target.checked)} />
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>Mostrar feriados nacionais 🇧🇷</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Exibe os feriados nacionais do Brasil na visão mensal da agenda.</div>
          </div>
        </label>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0 2px', borderTop:'1px solid var(--border)' }}>
          <input type="number" min={0} value={prefs.taskActivationDays}
            onChange={e => setActivationDays(Number(e.target.value))}
            className="form-input" style={{ width:70 }} />
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>Ativar tarefa rápida em (dias) ✅</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Notas da adição rápida ficam pendentes de ativação; se não ativadas neste prazo (padrão 10), vão para a lixeira e você é avisado. Use 0 para nunca expirar.</div>
          </div>
        </div>
        <div style={{ padding:'10px 0 2px', borderTop:'1px solid var(--border)' }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>Conta Google (Drive e Meet)</div>
          {googleMsg && <div className="form-hint" style={{ marginBottom:6 }}>{googleMsg}</div>}
          {!gstatus.configured
            ? <div style={{ fontSize:12, color:'var(--muted)' }}>Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no servidor (.env) para habilitar.</div>
            : gstatus.connected
              ? <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                  <span style={{ color:'var(--muted)' }}>Conectado: {gstatus.email || 'conta Google'}</span>
                  <button className="btn btn-outline btn-sm" onClick={disconnectGoogle}>Desconectar</button>
                </div>
              : <button className="btn btn-outline btn-sm" onClick={connectGoogle}>Conectar conta Google</button>
          }
        </div>
      </div>
      </Section>

      {/* Calendars section */}
      <Section title="Agendas">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setCalModal({})}>+ Nova Agenda</button>
        </div>
        {calendars.length === 0
          ? <div className="empty" style={{ padding:16 }}><div className="empty-text">Nenhuma agenda</div></div>
          : calendars.map(cal => (
              <div key={cal.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:16, height:16, borderRadius:4, background:cal.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{cal.name}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{cal.type}</div>
                </div>
                <a
                  href={`http://localhost:4000/api/export/ics/${cal.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  title="Exportar ICS (Google Agenda)"
                  style={{ display:'inline-flex', alignItems:'center', gap:4 }}
                ><Ionicons name="calendar-outline" size={14} /> .ics</a>
                <button className="btn btn-outline btn-sm" onClick={() => setShareModal(cal)}>Compartilhar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setCalModal(cal)} aria-label="Editar agenda"><Ionicons name="create-outline" size={16} /></button>
              </div>
            ))
        }
      </div>
      </Section>

      {/* Categories section */}
      <Section title="Categorias de evento">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setCatModal({})}>+ Nova Categoria</button>
        </div>
        {cats.length === 0
          ? <div className="empty" style={{ padding:16 }}><div className="empty-text">Nenhuma categoria</div></div>
          : cats.map(cat => (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)', opacity: cat.active ? 1 : 0.5 }}>
                <div style={{ width:16, height:16, borderRadius:4, background:cat.color, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{cat.label}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{cat.used ? `Em uso em ${cat.eventCount} evento(s)` : 'Não usada em eventos'}</div>
                </div>
                <span className="pill" style={{ background:cat.color+'22', color:cat.color, fontSize:10 }}>{SCOPE_LABEL[cat.scope] || cat.scope}</span>
                {!cat.active && <span className="pill" style={{ background:'#9993', color:'var(--muted)', fontSize:10 }}>inativa</span>}
                <button className="btn btn-outline btn-sm" onClick={() => toggleCategory(cat)}>{cat.active ? 'Desativar' : 'Ativar'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setCatModal(cat)} aria-label="Editar categoria"><Ionicons name="create-outline" size={16} /></button>
              </div>
            ))
        }
      </div>
      </Section>

      {/* Tipos de Sessão section */}
      <Section title="Tipos de sessão">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Tipos disponíveis ao registrar sessões.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setTipoModal({})}>+ Novo Tipo</button>
        </div>
        {tiposSessao.length === 0
          ? <div className="empty" style={{ padding:16 }}><div className="empty-text">Nenhum tipo cadastrado</div></div>
          : tiposSessao.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)', opacity: t.ativo ? 1 : 0.5 }}>
                <div style={{ width:16, height:16, borderRadius:4, background:t.cor||'#6b7280', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{t.label}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{t.key}</div>
                </div>
                {!t.ativo && <span className="pill" style={{ background:'#9993', color:'var(--muted)', fontSize:10 }}>inativo</span>}
                <button className="btn btn-outline btn-sm" onClick={() => toggleTipo(t)}>{t.ativo ? 'Desativar' : 'Ativar'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setTipoModal(t)} aria-label="Editar tipo"><Ionicons name="create-outline" size={16} /></button>
              </div>
            ))
        }
      </div>
      </Section>

      {/* Comemorativas (sessões anuais) section */}
      <Section title="Sessões Comemorativas">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Sugeridas no Título ao registrar sessões Comemorativas/Extra.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setSaModal({})}>+ Nova</button>
        </div>
        {anuais.length === 0
          ? <div className="empty" style={{ padding:16 }}><div className="empty-text">Nenhuma sessão anual cadastrada</div></div>
          : anuais.map(sa => (
              <div key={sa.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)', opacity: sa.ativo ? 1 : 0.5 }}>
                <div style={{ width:54, fontSize:12, color:'var(--muted)', flexShrink:0 }}>{sa.dia && sa.mes ? `${sa.dia} ${MES_ABREV[sa.mes]}` : '—'}</div>
                <div style={{ flex:1, minWidth:0, fontWeight:600, fontSize:14 }}>{sa.nome}</div>
                <span className="pill" style={{ background: sa.tipo==='EXTRA' ? '#1a7a4a22' : '#C9952A22', color: sa.tipo==='EXTRA' ? '#1a7a4a' : '#9A6B00', fontSize:10 }}>{sa.tipo==='EXTRA' ? 'Extra' : 'Anual'}</span>
                {!sa.ativo && <span className="pill" style={{ background:'#9993', color:'var(--muted)', fontSize:10 }}>inativa</span>}
                <button className="btn btn-outline btn-sm" onClick={() => toggleAnual(sa)}>{sa.ativo ? 'Desativar' : 'Ativar'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSaModal(sa)} aria-label="Editar sessão anual"><Ionicons name="create-outline" size={16} /></button>
              </div>
            ))
        }
      </div>
      </Section>

      {/* Export section */}
      <Section title="Exportação">
      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14 }}>
          Exporte qualquer agenda para iCalendar (.ics) e importe no Google Agenda, Apple Calendar ou Outlook.
          Use os botões ".ics" na seção de agendas acima.
        </p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {calendars.map(cal => (
            <a
              key={cal.id}
              href={`http://localhost:4000/api/export/ics/${cal.id}`}
              target="_blank" rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              <span style={{ width:10, height:10, borderRadius:2, background:cal.color, display:'inline-block' }} />
              {cal.name} (.ics)
            </a>
          ))}
        </div>
      </div>
      </Section>

      {/* Logout */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:600, marginBottom:2 }}>Sair da conta</div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>Encerra a sessão no dispositivo atual</div>
          </div>
          <button className="btn btn-danger" onClick={logout}>Sair</button>
        </div>
      </div>

      {calModal   !== null && <CalModal     cal={calModal}   onClose={()=>setCalModal(null)}   onSaved={onSaved} />}
      {shareModal !== null && <ShareModal   cal={shareModal} onClose={()=>setShareModal(null)} onSaved={onSaved} />}
      {catModal   !== null && <CategoryModal cat={catModal}  onClose={()=>setCatModal(null)}   onSaved={onSaved} />}
      {saModal    !== null && <SessaoAnualModal sa={saModal} onClose={()=>setSaModal(null)}    onSaved={onSaved} />}
      {tipoModal  !== null && <TipoSessaoModal tipo={tipoModal} onClose={()=>setTipoModal(null)} onSaved={onSaved} />}
    </div>
  );
}
