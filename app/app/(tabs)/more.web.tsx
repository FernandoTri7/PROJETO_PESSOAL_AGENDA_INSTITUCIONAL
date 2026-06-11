import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, clearToken } from '../../src/api';
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

function VegetalModal({ lote, onClose, onSaved }: any) {
  const isNew = !lote?.id;
  const [form, setForm] = useState<any>({ nome:'', origem:'', litros:'', local:'GELADEIRA', notas:'', ...(lote||{}) });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }

  async function save() {
    if (!form.nome.trim() || !form.litros) { setError('Nome e litros são obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const body = { ...form, litros: parseFloat(String(form.litros).replace(',','.')) };
      if (isNew) await api('/vegetal', { method: 'POST', body });
      else       await api(`/vegetal/${lote.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Excluir este lote?')) return;
    await api(`/vegetal/${lote.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Novo Lote' : 'Editar Lote'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Nome / Descrição *</label>
            <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Ex.: Tucunacá Baliza" autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Litros *</label>
              <input className="form-input" type="number" step="0.1" value={form.litros} onChange={set('litros')} />
            </div>
            <div className="form-group">
              <label className="form-label">Local</label>
              <select className="form-select" value={form.local} onChange={set('local')}>
                <option value="GELADEIRA">Geladeira</option>
                <option value="FORA">Fora (temperatura ambiente)</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Origem</label>
            <input className="form-input" value={form.origem||''} onChange={set('origem')} placeholder="Ex.: NRI, Itinga, Baliza..." />
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" value={form.notas||''} onChange={set('notas')} rows={2} />
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

export default function MoreWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [calendars, setCalendars] = useState<any[]>([]);
  const [vegetal, setVegetal] = useState<any>({ total: 0, lotes: [] });
  const [calModal, setCalModal] = useState<any>(null);
  const [shareModal, setShareModal] = useState<any>(null);
  const [vegModal, setVegModal] = useState<any>(null);

  async function load() {
    const [cals, veg] = await Promise.all([api('/calendars'), api('/vegetal')]).catch(()=>[[],{total:0,lotes:[]}]);
    setCalendars(cals); setVegetal(veg);
  }
  useEffect(() => { load(); }, []);

  async function logout() {
    await clearToken();
    router.replace('/login');
  }

  function onSaved() { setCalModal(null); setShareModal(null); setVegModal(null); load(); }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title" style={{ display:'inline-flex', alignItems:'center', gap:8 }}><Ionicons name="settings-outline" size={20} /> Configurações</h1>
      </div>

      {/* Calendars section */}
      <div className="section-label">Agendas</div>
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

      {/* Vegetal section */}
      <div className="section-label">Estoque de Vegetal</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>Total em estoque</div>
            <div style={{ fontSize:28, fontWeight:700, color:'#0F5C2E' }}>{vegetal.total?.toFixed(1)}L</div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => setVegModal({})}>+ Novo Lote</button>
        </div>
        {vegetal.lotes?.length === 0
          ? <div style={{ color:'var(--muted)', fontSize:13 }}>Nenhum lote registrado</div>
          : vegetal.lotes?.map((l: any) => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:'1px solid var(--border)', cursor:'pointer' }} onClick={() => setVegModal(l)}>
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
      </div>

      {/* Export section */}
      <div className="section-label">Exportação</div>
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
      {vegModal   !== null && <VegetalModal lote={vegModal}  onClose={()=>setVegModal(null)}   onSaved={onSaved} />}
    </div>
  );
}
