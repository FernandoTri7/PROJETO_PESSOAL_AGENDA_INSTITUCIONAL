import { useEffect, useState } from 'react';
import { api } from '../../src/api';
import { injectWebCss, fmtDate } from '../../src/webCss';

const PRIORITIES = [
  { key: 'ALTA',  label: 'Alta',  color: '#ef4444' },
  { key: 'MEDIA', label: 'Média', color: '#f59e0b' },
  { key: 'BAIXA', label: 'Baixa', color: '#22c55e' },
];

function pColor(p: string) { return PRIORITIES.find(x=>x.key===p)?.color ?? '#9ca3af'; }
function pLabel(p: string) { return PRIORITIES.find(x=>x.key===p)?.label ?? p; }

function TaskModal({ task, calendars, onClose, onSaved }: any) {
  const isNew = !task?.id;
  const [form, setForm] = useState<any>({
    calendarId: calendars[0]?.id || '', title: '', description: '',
    dueDate: '', priority: 'MEDIA', done: false,
    ...(task||{}),
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0,10) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function set(k: string) { return (e: any) => setForm((f:any) => ({...f, [k]: e.target.value})); }

  async function save() {
    if (!form.title.trim()) { setError('Título é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body = { ...form, dueDate: form.dueDate || null };
      if (isNew) await api('/tasks', { method: 'POST', body });
      else       await api(`/tasks/${task.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Excluir esta tarefa?')) return;
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
          <div className="form-group">
            <label className="form-label">Agenda</label>
            <select className="form-select" value={form.calendarId} onChange={set('calendarId')}>
              {calendars.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={form.description||''} onChange={set('description')} />
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

export default function TasksWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const [tasks, setTasks] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [filter, setFilter] = useState<'all'|'pending'|'done'>('pending');
  const [newTitle, setNewTitle] = useState('');

  async function load() {
    const [ts, cals] = await Promise.all([api('/tasks'), api('/calendars')]).catch(()=>[[],[]]);
    setTasks(ts); setCalendars(cals);
  }
  useEffect(() => { load(); }, []);

  async function quickAdd() {
    if (!newTitle.trim() || !calendars.length) return;
    await api('/tasks', { method: 'POST', body: { title: newTitle.trim(), calendarId: calendars[0].id, priority: 'MEDIA' } });
    setNewTitle(''); load();
  }

  async function toggle(t: any) {
    await api(`/tasks/${t.id}`, { method: 'PUT', body: { ...t, done: !t.done } });
    load();
  }

  const shown = tasks.filter(t =>
    filter === 'all' ? true : filter === 'done' ? t.done : !t.done
  );

  const pending = tasks.filter(t => !t.done).length;
  const done    = tasks.filter(t => t.done).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">✅ Tarefas</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Nova Tarefa</button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Pendentes</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{pending}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#22c55e' }}>
          <div className="stat-label">Concluídas</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{done}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{tasks.length}</div>
        </div>
      </div>

      {/* Quick add */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input
            className="form-input" style={{ flex:1 }}
            value={newTitle} onChange={e=>setNewTitle(e.target.value)}
            onKeyDown={e => e.key==='Enter' && quickAdd()}
            placeholder="Adicionar tarefa rápida... (Enter para salvar)"
          />
          <button className="btn btn-primary" onClick={quickAdd}>Adicionar</button>
        </div>
      </div>

      {/* Filter */}
      <div className="view-tabs" style={{ marginBottom: 14, display:'inline-flex' }}>
        <button className={`view-tab${filter==='pending'?' active':''}`} onClick={()=>setFilter('pending')}>Pendentes ({pending})</button>
        <button className={`view-tab${filter==='done'?' active':''}`} onClick={()=>setFilter('done')}>Concluídas ({done})</button>
        <button className={`view-tab${filter==='all'?' active':''}`} onClick={()=>setFilter('all')}>Todas ({tasks.length})</button>
      </div>

      {/* Task list */}
      {shown.length === 0
        ? <div className="empty"><div className="empty-icon">🎉</div><div className="empty-text">Nenhuma tarefa aqui</div></div>
        : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {shown.map(t => (
              <div key={t.id} className="ev-item" style={{ opacity: t.done ? .6 : 1 }}>
                <input
                  type="checkbox" checked={t.done}
                  onChange={() => toggle(t)}
                  style={{ width:18, height:18, cursor:'pointer', flexShrink:0 }}
                />
                <div className="ev-info" style={{ cursor:'pointer' }} onClick={() => setModal(t)}>
                  <div className="ev-title" style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
                    {t.title}
                  </div>
                  {(t.dueDate || t.description) && (
                    <div className="ev-meta">
                      {t.dueDate ? `Prazo: ${fmtDate(t.dueDate)}` : ''}
                      {t.description ? (t.dueDate?' · ':'')+t.description.slice(0,60) : ''}
                    </div>
                  )}
                </div>
                <span className="pill" style={{ background: pColor(t.priority)+'22', color: pColor(t.priority), flexShrink:0 }}>
                  {pLabel(t.priority)}
                </span>
              </div>
            ))}
          </div>
      }

      {modal && (
        <TaskModal
          task={modal.id ? modal : null}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
