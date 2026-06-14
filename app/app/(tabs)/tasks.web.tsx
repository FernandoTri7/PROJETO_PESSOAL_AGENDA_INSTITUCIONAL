import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { pickDriveFile } from '../../src/googlePicker';
import { loadPrefs, getPrefs } from '../../src/prefs';
import { injectWebCss, fmtDate } from '../../src/webCss';

const PRIORITIES = [
  { key: 'ALTA',  label: 'Alta',  color: '#ef4444' },
  { key: 'MEDIA', label: 'Média', color: '#f59e0b' },
  { key: 'BAIXA', label: 'Baixa', color: '#22c55e' },
];

const INBOX = '__none__'; // chave da Caixa de entrada (tarefas sem grupo)

// Marcador (web) da última vez que o usuário viu o aviso de notas expiradas.
const SEEN_KEY = 'tasksExpiredSeenAt';
function getSeenAt(): number { try { return Number(window.localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } }
function markSeenNow() { try { window.localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* ignora */ } }

function pColor(p: string) { return PRIORITIES.find(x=>x.key===p)?.color ?? '#9ca3af'; }
function pLabel(p: string) { return PRIORITIES.find(x=>x.key===p)?.label ?? p; }
function initials(name: string) {
  const parts = String(name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

function TaskModal({ task, calendars, groups, defaultCalendarId, onClose, onSaved, onGroupsChanged }: any) {
  const isNew = !task?.id;
  const [form, setForm] = useState<any>({
    calendarId: defaultCalendarId || calendars[0]?.id || '', title: '', description: '',
    priority: 'MEDIA', done: false,
    ...(task||{}),
    groupId: task?.groupId || '', assigneeId: task?.assigneeId || '',
    attachments: task?.attachments || [],
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0,10) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }

  const cal = calendars.find((c: any) => c.id === form.calendarId);
  const members = (cal?.members || []).map((m: any) => m.user).filter(Boolean);
  const calGroups = groups.filter((g: any) => g.calendarId === form.calendarId);

  async function onGroupSelect(e: any) {
    const v = e.target.value;
    if (v === '__new__') {
      const name = window.prompt('Nome do novo grupo:');
      if (!name || !name.trim()) return;
      try {
        const g = await api('/task-groups', { method: 'POST', body: { calendarId: form.calendarId, name: name.trim() } });
        await onGroupsChanged();
        setForm((f: any) => ({ ...f, groupId: g.id }));
      } catch (err: any) { alert(err.message); }
      return;
    }
    setForm((f: any) => ({ ...f, groupId: v }));
  }

  function addAttachment() {
    const name = attName.trim(), url = attUrl.trim();
    if (!name || !url) return;
    setForm((f: any) => ({ ...f, attachments: [...(f.attachments || []), { name, url, provider: 'link' }] }));
    setAttName(''); setAttUrl('');
  }
  function removeAttachment(i: number) {
    setForm((f: any) => ({ ...f, attachments: f.attachments.filter((_: any, j: number) => j !== i) }));
  }
  async function attachFromDrive() {
    try {
      const t = await api('/google/token');
      const file = await pickDriveFile(t.accessToken, t.apiKey);
      if (file) setForm((f: any) => ({ ...f, attachments: [...(f.attachments || []), { name: file.name, url: file.url, provider: 'drive', mimeType: file.mimeType }] }));
    } catch (e: any) { alert(e.message + '\nConecte sua conta Google em Mais → Preferências.'); }
  }

  async function save() {
    if (!form.title.trim()) { setError('Título é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        calendarId: form.calendarId, title: form.title.trim(),
        description: form.description || null,
        priority: form.priority, done: form.done,
        dueDate: form.dueDate || null,
        groupId: form.groupId || null,
        assigneeId: form.assigneeId || null,
        activated: true, // salvar pelo modal ativa a tarefa (deixa de ser provisória)
        attachments: (form.attachments || []).map((a: any) => ({ name: a.name, url: a.url, provider: a.provider || 'link', mimeType: a.mimeType || null })),
      };
      if (isNew) await api('/tasks', { method: 'POST', body });
      else       await api(`/tasks/${task.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Mover esta tarefa para a lixeira?')) return;
    await api(`/tasks/${task.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Nova Tarefa' : 'Editar Tarefa'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={set('title')} autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="form-select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prazo</label>
              <input className="form-input" type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Agenda</label>
              <select className="form-select" value={form.calendarId}
                onChange={(e) => setForm((f: any) => ({ ...f, calendarId: e.target.value, groupId: '', assigneeId: '' }))}>
                {calendars.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <select className="form-select" value={form.assigneeId} onChange={set('assigneeId')}>
                <option value="">Ninguém</option>
                {members.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select className="form-select" value={form.groupId} onChange={onGroupSelect}>
              <option value="">Caixa de entrada (sem grupo)</option>
              {calGroups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="__new__">+ Novo grupo...</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={form.description||''} onChange={set('description')} />
          </div>

          <div className="form-group">
            <label className="form-label">Anexos</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Nome" value={attName} onChange={e => setAttName(e.target.value)} style={{ flex: '0 0 30%' }} />
              <input className="form-input" placeholder="https://..." value={attUrl} onChange={e => setAttUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttachment(); } }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={addAttachment}>Adicionar</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={attachFromDrive}>
                <Ionicons name="logo-google" size={13} color="#52606D" /> Anexar do Drive
              </button>
            </div>
            {form.attachments?.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {form.attachments.map((a: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Ionicons name={a.provider === 'drive' ? 'logo-google' : 'attach-outline'} size={14} color="#52606D" />
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</a>
                    <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => removeAttachment(i)}>✕</span>
                  </div>
                ))}
              </div>
            )}
            <div className="form-hint">Cole um link manual ou use "Anexar do Drive" (requer conta Google conectada).</div>
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

function GroupsModal({ calendars, groups, onClose, onChanged }: any) {
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || '');
  const [name, setName] = useState('');
  const calGroups = groups.filter((g: any) => g.calendarId === calendarId);

  async function add() {
    if (!name.trim() || !calendarId) return;
    try { await api('/task-groups', { method: 'POST', body: { calendarId, name: name.trim() } }); setName(''); await onChanged(); }
    catch (e: any) { alert(e.message); }
  }
  async function rename(g: any) {
    const novo = window.prompt('Novo nome do grupo:', g.name);
    if (!novo || !novo.trim() || novo.trim() === g.name) return;
    try { await api(`/task-groups/${g.id}`, { method: 'PUT', body: { name: novo.trim() } }); await onChanged(); }
    catch (e: any) { alert(e.message); }
  }
  async function del(g: any) {
    if (!confirm(`Excluir o grupo "${g.name}"? As tarefas dele ficam sem grupo (Caixa de entrada).`)) return;
    try { await api(`/task-groups/${g.id}`, { method: 'DELETE' }); await onChanged(); }
    catch (e: any) { alert(e.message); }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Grupos de tarefas</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Agenda</label>
            <select className="form-select" value={calendarId} onChange={e => setCalendarId(e.target.value)}>
              {calendars.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Novo grupo</label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" style={{ flex:1 }} value={name} onChange={e=>setName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && add()} placeholder="Ex.: Bazar, Manutenção..." />
              <button className="btn btn-primary" onClick={add}>Adicionar</button>
            </div>
          </div>
          {calGroups.length === 0
            ? <div className="form-hint">Nenhum grupo nesta agenda ainda.</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
                {calGroups.map((g: any) => (
                  <div key={g.id} className="ev-item" style={{ padding:'9px 12px' }}>
                    <div className="ev-info"><div className="ev-title">{g.name}</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => rename(g)}>Renomear</button>
                    <button className="btn btn-ghost btn-sm" style={{ color:'#ef4444' }} onClick={() => del(g)}>Excluir</button>
                  </div>
                ))}
              </div>
          }
        </div>
        <div className="modal-footer">
          <span style={{ flex:1 }} />
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function TasksWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [tasks, setTasks] = useState<any[]>([]);
  const [trash, setTrash] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [prefs, setPrefs] = useState(getPrefs());
  const [modal, setModal] = useState<any>(null);
  const [groupsModal, setGroupsModal] = useState(false);
  const [view, setView] = useState<'list'|'trash'>('list');
  const [expiredNotice, setExpiredNotice] = useState<any[]>([]); // notas auto-excluídas desde a última visualização
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'done'>('pending');
  const [calFilter, setCalFilter] = useState<string>('');   // '' = todas
  const [groupFilter, setGroupFilter] = useState<string>(''); // '' = todos | INBOX | id
  const [newTitle, setNewTitle] = useState('');

  // FAB global: ?new=<ts> abre o modal de nova tarefa
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { if (newParam) setModal({}); }, [newParam]);

  // Notificação web (best-effort) quando notas expiram, se as notificações estiverem ligadas.
  function notifyExpired(list: any[]) {
    if (!getPrefs().notificationsEnabled) return;
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      const body = `${list.length} nota(s) da Caixa de entrada foram movidas para a lixeira por não serem ativadas.`;
      if (Notification.permission === 'granted') new Notification('Tarefas expiradas', { body });
      else if (Notification.permission !== 'denied') Notification.requestPermission();
    } catch { /* ignora */ }
  }

  async function load() {
    const [ts, cals, gs, tr] = await Promise.all([
      api('/tasks'), api('/calendars'), api('/task-groups'), api('/tasks?trash=1'),
    ]).catch(()=>[[],[],[],[]]);
    setTasks(ts); setCalendars(cals); setGroups(gs); setTrash(tr);
    // Notas auto-excluídas (na lixeira, nunca ativadas) desde a última visualização → aviso.
    const seen = getSeenAt();
    const fresh = (tr || []).filter((t: any) => t.activated === false && new Date(t.deletedAt).getTime() > seen);
    if (fresh.length) { setExpiredNotice(fresh); notifyExpired(fresh); }
  }
  async function loadGroups() { try { setGroups(await api('/task-groups')); } catch { /* ignora */ } }
  async function loadTrash() { try { setTrash(await api('/tasks?trash=1')); } catch { /* ignora */ } }
  useEffect(() => { load(); loadPrefs().then(setPrefs); }, []);
  useEffect(() => { if (view === 'trash') { loadTrash(); markSeenNow(); setExpiredNotice([]); } }, [view]);

  async function quickAdd() {
    const calId = calFilter || calendars[0]?.id;
    if (!newTitle.trim() || !calId) return;
    // Adição rápida entra como provisória (pendente de ativação) na Caixa de entrada.
    await api('/tasks', { method: 'POST', body: { title: newTitle.trim(), calendarId: calId, priority: 'MEDIA', activated: false } });
    setNewTitle(''); load();
  }

  async function toggle(t: any) {
    await api(`/tasks/${t.id}`, { method: 'PUT', body: { done: !t.done } });
    load();
  }
  async function activate(t: any) {
    await api(`/tasks/${t.id}`, { method: 'PUT', body: { activated: true } });
    load();
  }
  async function restore(t: any) {
    await api(`/tasks/${t.id}/restore`, { method: 'POST' });
    loadTrash(); load();
  }
  async function purge(t: any) {
    if (!confirm('Excluir definitivamente? Esta ação não pode ser desfeita.')) return;
    await api(`/tasks/${t.id}?permanent=1`, { method: 'DELETE' });
    loadTrash();
  }

  const calById: Record<string, any> = Object.fromEntries(calendars.map((c: any) => [c.id, c]));

  // Conjunto filtrado por agenda (base para os totais).
  const byCal = tasks.filter(t => !calFilter || t.calendarId === calFilter);
  const pending = byCal.filter(t => !t.done).length;
  const done    = byCal.filter(t => t.done).length;

  // Resumo por agenda (mostrado quando se vê "Todas as agendas").
  const calSummary = calendars
    .map((c: any) => {
      const ts = tasks.filter(t => t.calendarId === c.id);
      return { c, pending: ts.filter(t => !t.done).length, done: ts.filter(t => t.done).length, total: ts.length };
    })
    .filter(s => s.total > 0);

  // Aplica também grupo e status para a listagem exibida.
  const shown = byCal.filter(t => {
    if (groupFilter === INBOX ? t.groupId : groupFilter ? t.groupId !== groupFilter : false) return false;
    if (statusFilter === 'pending' && t.done) return false;
    if (statusFilter === 'done' && !t.done) return false;
    return true;
  });

  // Agrupa em seções (Caixa de entrada primeiro, depois grupos).
  const byGroup: Record<string, any[]> = {};
  for (const t of shown) { const k = t.groupId || INBOX; (byGroup[k] ||= []).push(t); }
  const sectionKeys = [
    ...(byGroup[INBOX] ? [INBOX] : []),
    ...groups.filter((g: any) => byGroup[g.id]).map((g: any) => g.id),
  ];
  const groupName = (k: string) => {
    if (k === INBOX) return '📥 Caixa de entrada';
    const g = groups.find((x: any) => x.id === k);
    if (!g) return 'Grupo';
    const c = !calFilter ? calById[g.calendarId] : null; // mostra a agenda quando vendo "Todas"
    return c ? `${g.name} · ${c.name}` : g.name;
  };

  // Grupos disponíveis no filtro: da agenda selecionada (ou todos).
  const filterGroups = groups.filter((g: any) => !calFilter || g.calendarId === calFilter);

  function expiryLabel(t: any) {
    const days = Number(prefs.taskActivationDays) || 0;
    if (!days) return 'sem prazo de ativação';
    const left = Math.ceil((new Date(t.createdAt).getTime() + days * 86400000 - Date.now()) / 86400000);
    return left <= 0 ? 'expira hoje' : `expira em ${left} dia${left !== 1 ? 's' : ''}`;
  }

  function TaskRow({ t }: any) {
    const provisional = t.activated === false;
    return (
      <div className="ev-item" style={{ opacity: t.done ? .6 : 1, ...(provisional ? { borderLeft: '3px solid #f59e0b' } : {}) }}>
        <input type="checkbox" checked={t.done} onChange={() => toggle(t)} style={{ width:18, height:18, cursor:'pointer', flexShrink:0 }} />
        <div className="ev-info" style={{ cursor:'pointer' }} onClick={() => setModal(t)}>
          <div className="ev-title" style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
          {(t.dueDate || t.description || t.attachments?.length || provisional) && (
            <div className="ev-meta">
              {provisional ? `⏳ Pendente de ativação · ${expiryLabel(t)}` : ''}
              {!provisional && t.dueDate ? `Prazo: ${fmtDate(t.dueDate)}` : ''}
              {!provisional && t.attachments?.length ? `${t.dueDate?' · ':''}📎 ${t.attachments.length}` : ''}
              {!provisional && t.description ? ((t.dueDate||t.attachments?.length)?' · ':'')+t.description.slice(0,50) : ''}
            </div>
          )}
        </div>
        {provisional && <button className="btn btn-gold btn-sm" style={{ flexShrink:0 }} onClick={() => activate(t)}>Ativar</button>}
        {!calFilter && calById[t.calendarId] && (
          <span className="pill" title={`Agenda: ${calById[t.calendarId].name}`} style={{ background:(calById[t.calendarId].color||'#999')+'22', color:'var(--muted)', display:'inline-flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:calById[t.calendarId].color||'#999', display:'inline-block' }} />
            {calById[t.calendarId].name}
          </span>
        )}
        {t.assignee && (
          <span title={`Responsável: ${t.assignee.name}`} style={{ display:'inline-flex', alignItems:'center', flexShrink:0 }}>
            <span style={{ width:24, height:24, borderRadius:'50%', background:'var(--navy)', color:'#fff', fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{initials(t.assignee.name)}</span>
          </span>
        )}
        <span className="pill" style={{ background: pColor(t.priority)+'22', color: pColor(t.priority), flexShrink:0 }}>{pLabel(t.priority)}</span>
      </div>
    );
  }

  // ── Lixeira ──
  if (view === 'trash') {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">🗑️ Lixeira</h1>
          <button className="btn btn-outline" onClick={() => setView('list')}>← Voltar às tarefas</button>
        </div>
        {trash.length === 0
          ? <div className="empty"><div className="empty-icon"><Ionicons name="trash-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Lixeira vazia</div></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {trash.map(t => (
                <div key={t.id} className="ev-item">
                  <div className="ev-info">
                    <div className="ev-title">{t.title}</div>
                    <div className="ev-meta">
                      Excluída em {fmtDate(t.deletedAt)}
                      {calById[t.calendarId] ? ` · ${calById[t.calendarId].name}` : ''}
                      {t.group ? ` · ${t.group.name}` : ''}
                      {t.activated === false ? ' · expirada' : ''}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => restore(t)}>Restaurar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => purge(t)}>Excluir definitivamente</button>
                </div>
              ))}
            </div>
        }
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">✅ Tarefas</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={() => setView('trash')}>
            <Ionicons name="trash-outline" size={14} color="#52606D" /> Lixeira
          </button>
          <button className="btn btn-outline" onClick={() => setGroupsModal(true)}>
            <Ionicons name="folder-outline" size={14} color="#52606D" /> Grupos
          </button>
          <button className="btn btn-primary" onClick={() => setModal({})}>+ Nova Tarefa</button>
        </div>
      </div>

      {/* Aviso de notas expiradas (auto-excluídas por não serem ativadas) */}
      {expiredNotice.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 12, borderLeft: '4px solid #f59e0b', display:'flex', alignItems:'center', gap:10 }}>
          <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
          <div style={{ flex:1, fontSize:13 }}>
            <b>{expiredNotice.length}</b> nota(s) da Caixa de entrada foram movidas para a lixeira por não serem ativadas no prazo.
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => { markSeenNow(); setExpiredNotice([]); setView('trash'); }}>Ver lixeira</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { markSeenNow(); setExpiredNotice([]); }}>Dispensar</button>
        </div>
      )}

      {/* Stats (respeitam o filtro de agenda) */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Pendentes{calFilter ? ' (agenda)' : ''}</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{pending}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="stat-label">Concluídas{calFilter ? ' (agenda)' : ''}</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{done}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total{calFilter ? ' (agenda)' : ''}</div>
          <div className="stat-value">{byCal.length}</div>
        </div>
      </div>

      {/* Resumo por agenda (apenas em "Todas as agendas") */}
      {!calFilter && calSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 14 }}>
          <div className="section-label" style={{ margin: '0 0 8px' }}>Resumo por agenda</div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {calSummary.map((s, i) => (
              <div key={s.c.id} onClick={() => { setCalFilter(s.c.id); setGroupFilter(''); }}
                style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 4px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width:11, height:11, borderRadius:'50%', background:s.c.color||'#999', flexShrink:0 }} />
                <span style={{ flex:1, fontWeight:600, fontSize:14 }}>{s.c.name}</span>
                <span style={{ fontSize:13, color:'#f59e0b', fontWeight:700, minWidth:78, textAlign:'right' }}>{s.pending} pend.</span>
                <span style={{ fontSize:13, color:'#22c55e', fontWeight:700, minWidth:78, textAlign:'right' }}>{s.done} concl.</span>
                <span style={{ fontSize:13, color:'var(--muted)', minWidth:64, textAlign:'right' }}>{s.total} total</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input
            className="form-input" style={{ flex:1 }}
            value={newTitle} onChange={e=>setNewTitle(e.target.value)}
            onKeyDown={e => e.key==='Enter' && quickAdd()}
            placeholder="Adicionar à Caixa de entrada... (Enter; fica pendente de ativação)"
          />
          <button className="btn btn-primary" onClick={quickAdd}>Adicionar</button>
        </div>
      </div>

      {/* Abas de agenda (navegação) — estilo sublinhado */}
      <div className="cal-tabs" style={{ marginBottom: 14 }}>
        <button className={`cal-tab${!calFilter?' active':''}`} onClick={() => { setCalFilter(''); setGroupFilter(''); }}>Todas as agendas</button>
        {calendars.map((c:any) => (
          <button key={c.id} className={`cal-tab${calFilter===c.id?' active':''}`} onClick={() => { setCalFilter(c.id); setGroupFilter(''); }}>
            <span className="cal-tab-dot" style={{ background: c.color || '#999' }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Filtros: grupo + status */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom: 14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--muted)' }}>Grupo:</span>
          <select className="form-select" style={{ width:'auto' }} value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value={INBOX}>📥 Caixa de entrada</option>
            {filterGroups.map((g:any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--muted)' }}>Mostrar:</span>
          <div className="view-tabs" style={{ display:'inline-flex' }}>
            <button className={`view-tab${statusFilter==='pending'?' active':''}`} onClick={()=>setStatusFilter('pending')}>Pendentes ({pending})</button>
            <button className={`view-tab${statusFilter==='done'?' active':''}`} onClick={()=>setStatusFilter('done')}>Concluídas ({done})</button>
            <button className={`view-tab${statusFilter==='all'?' active':''}`} onClick={()=>setStatusFilter('all')}>Todas ({byCal.length})</button>
          </div>
        </div>
      </div>

      {/* Lista por seções de grupo */}
      {shown.length === 0
        ? <div className="empty"><div className="empty-icon"><Ionicons name="checkmark-done-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Nenhuma tarefa aqui</div></div>
        : sectionKeys.map((k) => {
            const items = byGroup[k];
            const pend = items.filter((t: any) => !t.done).length;
            return (
              <div key={k} style={{ marginBottom: 18 }}>
                <div className="section-label">{groupName(k)} · {pend} pendente{pend!==1?'s':''} / {items.length}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {items.map((t: any) => <TaskRow key={t.id} t={t} />)}
                </div>
              </div>
            );
          })
      }

      {modal && (
        <TaskModal
          task={modal.id ? modal : null}
          calendars={calendars}
          groups={groups}
          defaultCalendarId={calFilter}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          onGroupsChanged={loadGroups}
        />
      )}
      {groupsModal && (
        <GroupsModal
          calendars={calendars}
          groups={groups}
          onClose={() => setGroupsModal(false)}
          onChanged={loadGroups}
        />
      )}
    </div>
  );
}
