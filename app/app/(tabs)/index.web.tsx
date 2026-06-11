import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import {
  injectWebCss, getCatColor, getCatLabel, NAV_CATS,
  MONTHS_PT, WDAYS_PT, WDAYS_SHORT, fmtDate, fmtTime, dayKey,
} from '../../src/webCss';

// ─── helpers ───────────────────────────────────────────────────────────────

const RECURRENCES = [
  { key: '', label: 'Não repete' },
  { key: 'FREQ=DAILY', label: 'Diário' },
  { key: 'FREQ=WEEKLY', label: 'Semanal' },
  { key: 'FREQ=WEEKLY;INTERVAL=2', label: 'Quinzenal' },
  { key: 'FREQ=MONTHLY', label: 'Mensal' },
  { key: 'FREQ=YEARLY', label: 'Anual' },
];

function todayKey() { return dayKey(new Date()); }

// ─── Event Form Modal ───────────────────────────────────────────────────────

function EventModal({ ev, calendars, onClose, onSaved }: any) {
  const isNew = !ev?.id;
  const [form, setForm] = useState<any>({
    title: '', calendarId: calendars[0]?.id || '', category: 'reuniao',
    startDate: todayKey(), startTime: '09:00', endTime: '10:00',
    allDay: false, location: '', description: '', rrule: '', reminders: '',
    ...( ev
      ? {
          ...ev,
          startDate: ev.start ? new Date(ev.start).toISOString().slice(0,10) : todayKey(),
          startTime: ev.start ? fmtTime(ev.start) : '09:00',
          endTime:   ev.end   ? fmtTime(ev.end)   : '10:00',
          rrule: ev.rrule || '',
        }
      : {} ),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(k: string) { return (e: any) => setForm((f: any) => ({ ...f, [k]: e.target ? e.target.value : e })); }
  function setB(k: string) { return (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.checked })); }

  async function save() {
    if (!form.title.trim()) { setError('Título é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        calendarId: form.calendarId, title: form.title.trim(),
        description: form.description || null, location: form.location || null,
        category: form.category, rrule: form.rrule || null, reminders: form.reminders || null,
        allDay: form.allDay,
        start: form.allDay ? `${form.startDate}T00:00:00` : `${form.startDate}T${form.startTime}:00`,
        end:   form.allDay ? `${form.startDate}T23:59:00` : `${form.startDate}T${form.endTime}:00`,
      };
      if (isNew) await api('/events', { method: 'POST', body });
      else       await api(`/events/${ev.id}`, { method: 'PUT', body });
      onSaved();
    } catch(e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm('Excluir este evento?')) return;
    await api(`/events/${ev.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Novo evento' : 'Editar evento'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Ex.: Reunião mensal" autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Agenda</label>
              <select className="form-select" value={form.calendarId} onChange={set('calendarId')}>
                {calendars.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                {NAV_CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={form.startDate} onChange={set('startDate')} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
            <input type="checkbox" id="allday" checked={form.allDay} onChange={setB('allDay')} />
            <label htmlFor="allday" style={{ fontSize: 13, cursor: 'pointer' }}>Dia inteiro</label>
          </div>

          {!form.allDay && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Início</label>
                <input className="form-input" type="time" value={form.startTime} onChange={set('startTime')} />
              </div>
              <div className="form-group">
                <label className="form-label">Fim</label>
                <input className="form-input" type="time" value={form.endTime} onChange={set('endTime')} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Recorrência</label>
            <select className="form-select" value={form.rrule} onChange={set('rrule')}>
              {RECURRENCES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Local</label>
            <input className="form-input" value={form.location || ''} onChange={set('location')} placeholder="Endereço ou link" />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={form.description || ''} onChange={set('description')} />
          </div>

          <div className="form-group">
            <label className="form-label">Lembretes (min antes, ex: 10,60)</label>
            <input className="form-input" value={form.reminders || ''} onChange={set('reminders')} placeholder="10,60" />
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && <button className="btn btn-danger btn-sm" onClick={remove}>Excluir</button>}
          <span style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Monthly view ───────────────────────────────────────────────────────────

function MonthView({ month, events, selected, setSelected, onNewAt, onEditEv }: any) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const startWday = first.getDay();
  const cells: (Date|null)[] = [
    ...Array(startWday).fill(null),
    ...Array.from({ length: daysInMonth }, (_,i) => new Date(month.getFullYear(), month.getMonth(), i+1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const today = todayKey();

  const byDay: Record<string, any[]> = {};
  for (const ev of events) {
    const k = dayKey(new Date(ev.start));
    (byDay[k] ||= []).push(ev);
  }

  const dayEvs = byDay[selected] || [];

  return (
    <div className="cal-split">
      <div>
        {/* Calendar grid */}
        <div className="cal-grid">
          {WDAYS_SHORT.map((w,i) => <div key={i} className="cal-wday">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="cal-cell other-month" />;
            const k = dayKey(d);
            const evs = byDay[k] || [];
            const isToday = k === today;
            const isSel = k === selected;
            return (
              <div
                key={i}
                className={`cal-cell${isToday ? ' today' : ''}${isSel ? ' selected' : ''}`}
                onClick={() => setSelected(k)}
                onDoubleClick={() => onNewAt(k)}
              >
                <span className="day-num">{d.getDate()}</span>
                <div className="day-evs">
                  {evs.slice(0,3).map((ev: any, j: number) => (
                    <div
                      key={j} className="day-ev"
                      style={{ background: getCatColor(ev.category) }}
                      onClick={(e) => { e.stopPropagation(); onEditEv(ev); }}
                      title={ev.title}
                    >{ev.title}</div>
                  ))}
                  {evs.length > 3 && <div className="day-more">+{evs.length-3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day panel */}
      <div className="day-panel">
        <div className="day-panel-header">
          <div className="day-panel-title">
            {selected ? (() => {
              const [y,m,d] = selected.split('-').map(Number);
              return `${d} de ${MONTHS_PT[m-1]} de ${y}`;
            })() : 'Selecione um dia'}
          </div>
          <div className="day-panel-sub">{dayEvs.length} evento{dayEvs.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="day-panel-body">
          {dayEvs.length === 0
            ? <div className="empty"><div className="empty-icon"><Ionicons name="calendar-clear-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Nenhum evento</div></div>
            : <div className="ev-list">
                {dayEvs.map((ev: any) => (
                  <div key={ev.id + (ev.occurrence||'')} className="ev-item" onClick={() => !ev.occurrence && onEditEv(ev)}>
                    <div className="ev-bar" style={{ background: getCatColor(ev.category) }} />
                    <div className="ev-info">
                      <div className="ev-title">{ev.title}{ev.occurrence ? ' ↻' : ''}</div>
                      <div className="ev-meta">
                        {ev.allDay ? 'Dia inteiro' : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </div>
                    </div>
                    <span className="pill" style={{ background: getCatColor(ev.category)+'22', color: getCatColor(ev.category), fontSize: 10 }}>
                      {getCatLabel(ev.category)}
                    </span>
                  </div>
                ))}
              </div>
          }
          {selected && (
            <button className="btn btn-gold btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => onNewAt(selected)}>
              + Novo evento neste dia
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List view ──────────────────────────────────────────────────────────────

function ListView({ events, onEdit }: any) {
  if (!events.length) return <div className="empty"><div className="empty-icon"><Ionicons name="list-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Nenhum evento neste período</div></div>;
  const grouped: Record<string, any[]> = {};
  for (const ev of events) {
    const k = dayKey(new Date(ev.start));
    (grouped[k] ||= []).push(ev);
  }
  const keys = Object.keys(grouped).sort();
  return (
    <div>
      {keys.map(k => {
        const [y,m,d] = k.split('-').map(Number);
        const label = `${WDAYS_PT[new Date(y,m-1,d).getDay()]}, ${d} de ${MONTHS_PT[m-1]}`;
        return (
          <div key={k} style={{ marginBottom: 20 }}>
            <div className="section-label">{label}</div>
            <div className="ev-list">
              {grouped[k].map((ev: any) => (
                <div key={ev.id+(ev.occurrence||'')} className="ev-item" onClick={() => !ev.occurrence && onEdit(ev)}>
                  <div className="ev-bar" style={{ background: getCatColor(ev.category) }} />
                  <div className="ev-info">
                    <div className="ev-title">{ev.title}{ev.occurrence ? ' ↻' : ''}</div>
                    <div className="ev-meta">
                      {ev.allDay ? 'Dia inteiro' : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </div>
                  </div>
                  <span className="tag" style={{ background: getCatColor(ev.category)+'22', color: getCatColor(ev.category) }}>
                    {getCatLabel(ev.category)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Category view ──────────────────────────────────────────────────────────

function CatView({ events, onEdit }: any) {
  const [open, setOpen] = useState<string|null>(null);
  const grouped: Record<string, any[]> = {};
  for (const ev of events) {
    (grouped[ev.category] ||= []).push(ev);
  }
  const cats = Object.entries(grouped).sort((a,b) => b[1].length - a[1].length);
  const max = cats[0]?.[1].length || 1;
  if (!cats.length) return <div className="empty"><div className="empty-icon"><Ionicons name="albums-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Nenhum evento neste período</div></div>;
  return (
    <div>
      {cats.map(([cat, evs]) => {
        const color = getCatColor(cat);
        const isOpen = open === cat;
        return (
          <div key={cat} className="cat-section">
            <div className="cat-header" style={{ background: color }} onClick={() => setOpen(isOpen ? null : cat)}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{getCatLabel(cat)}</span>
              <span className="cat-count">{evs.length} evento{evs.length!==1?'s':''} {isOpen ? '▲' : '▼'}</span>
            </div>
            <div className="cat-bar-wrap"><div className="cat-bar-fill" style={{ background: color, width: `${evs.length/max*100}%` }} /></div>
            {isOpen && (
              <div className="ev-list">
                {evs.map((ev: any) => (
                  <div key={ev.id+(ev.occurrence||'')} className="ev-item" onClick={() => !ev.occurrence && onEdit(ev)}>
                    <div className="ev-bar" style={{ background: color }} />
                    <div className="ev-info">
                      <div className="ev-title">{ev.title}</div>
                      <div className="ev-meta">{fmtDate(ev.start)} · {ev.allDay ? 'Dia inteiro' : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Annual view ────────────────────────────────────────────────────────────

function AnnualView({ year, events, onDayClick }: any) {
  const today = todayKey();
  const byDay: Record<string, number> = {};
  for (const ev of events) { const k = dayKey(new Date(ev.start)); byDay[k] = (byDay[k]||0)+1; }

  return (
    <div className="year-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const days = new Date(year, m+1, 0).getDate();
        const startWd = first.getDay();
        const cells: (number|null)[] = [...Array(startWd).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
        while (cells.length % 7 !== 0) cells.push(null);
        return (
          <div key={m} className="card" style={{ padding: 12 }}>
            <div className="mini-cal-title">{MONTHS_PT[m]}</div>
            <div className="mini-grid">
              {['D','S','T','Q','Q','S','S'].map((w,i) => <div key={i} className="mini-wday">{w}</div>)}
              {cells.map((d,i) => {
                if (!d) return <div key={i} className="mini-cell" style={{ background: '#f9f8f4' }} />;
                const k = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                return (
                  <div key={i}
                    className={`mini-cell${byDay[k] ? ' has-ev' : ''}${k===today ? ' today' : ''}`}
                    onClick={() => onDayClick(k)}
                    title={byDay[k] ? `${byDay[k]} evento(s)` : ''}
                  >{d}</div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AgendaWeb() {
  useEffect(() => { injectWebCss(); }, []);

  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(dayKey(today));
  const [view, setView] = useState<'mensal'|'lista'|'categoria'|'anual'>('mensal');
  const [events, setEvents] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<any>(null); // null | 'new' | event object
  const [loading, setLoading] = useState(false);

  // For annual: load entire year
  const year = month.getFullYear();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      let from: string, to: string;
      if (view === 'anual') {
        from = `${year}-01-01T00:00:00`;
        to   = `${year}-12-31T23:59:59`;
      } else {
        from = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
        to   = new Date(month.getFullYear(), month.getMonth()+1, 0, 23, 59, 59).toISOString();
      }
      const params = new URLSearchParams({ from, to });
      if (query) params.set('q', query);
      setEvents(await api(`/events?${params}`));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [month, view, query, year]);

  useEffect(() => {
    api('/calendars').then(setCalendars).catch(()=>{});
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function prevMonth() { setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1)); }
  function nextMonth() { setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1)); }
  function prevYear() { setMonth(new Date(year-1, month.getMonth(), 1)); }
  function nextYear() { setMonth(new Date(year+1, month.getMonth(), 1)); }
  function goToday() { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(dayKey(today)); }

  function onSaved() { setModal(null); loadEvents(); }
  function onEditEv(ev: any) { setModal(ev); }
  function onNewAt(date: string) { setModal({ _newDate: date }); }
  function onAnnualDay(k: string) {
    const [y,m] = k.split('-').map(Number);
    setMonth(new Date(y, m-1, 1));
    setSelected(k);
    setView('mensal');
  }

  const isAnual = view === 'anual';
  const navTitle = isAnual
    ? String(year)
    : `${MONTHS_PT[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="cal-nav-title">{navTitle}</div>
          <button className="btn btn-outline btn-sm" onClick={isAnual ? prevYear : prevMonth}>‹</button>
          <button className="btn btn-outline btn-sm" onClick={goToday}>Hoje</button>
          <button className="btn btn-outline btn-sm" onClick={isAnual ? nextYear : nextMonth}>›</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-wrap">
            <span className="search-icon"><Ionicons name="search-outline" size={16} color="#52606D" /></span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadEvents()}
              placeholder="Pesquisar eventos..."
            />
          </div>
          <div className="view-tabs">
            {(['mensal','lista','categoria','anual'] as const).map(v => (
              <button key={v} className={`view-tab${view===v?' active':''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && <div style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 13 }}>Carregando...</div>}

      {view === 'mensal' && (
        <MonthView
          month={month} events={events} selected={selected}
          setSelected={setSelected} onNewAt={onNewAt} onEditEv={onEditEv}
        />
      )}
      {view === 'lista' && <ListView events={events} onEdit={onEditEv} />}
      {view === 'categoria' && <CatView events={events} onEdit={onEditEv} />}
      {view === 'anual' && <AnnualView year={year} events={events} onDayClick={onAnnualDay} />}

      {/* FAB */}
      <button className="fab" onClick={() => setModal({ _newDate: selected })} title="Novo evento">＋</button>

      {/* Modal */}
      {modal && (
        <EventModal
          ev={modal._newDate ? { startDate: modal._newDate } : modal}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
