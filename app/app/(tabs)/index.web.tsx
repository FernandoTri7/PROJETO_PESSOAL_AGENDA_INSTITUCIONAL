import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { loadPrefs, getPrefs, savePrefs, isAdmin as getIsAdmin } from '../../src/prefs';
import { requestNotificationPermission, scheduleEventNotifications } from '../../src/notifications';
import { pickDriveFile } from '../../src/googlePicker';
import {
  injectWebCss, getCatColor, getCatLabel, setCategories,
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

// Evento "dia inteiro" que cobre mais de um dia → desenhado como barra contínua na grade mensal.
function isMultiDaySpan(ev: any): boolean {
  if (!ev.allDay || !ev.end) return false;
  return dayKey(new Date(ev.end)) > dayKey(new Date(ev.start));
}

// Dias (keys YYYY-MM-DD) que um evento ocupa. Eventos "dia inteiro" de vários dias
// aparecem em cada dia do intervalo; os demais ficam apenas no dia de início.
function eventDayKeys(ev: any): string[] {
  const startK = dayKey(new Date(ev.start));
  if (!ev.allDay || !ev.end) return [startK];
  const endK = dayKey(new Date(ev.end));
  if (endK <= startK) return [startK];
  const keys: string[] = [];
  const d = new Date(ev.start); d.setHours(12, 0, 0, 0); // meio-dia evita borda de fuso/DST
  while (dayKey(d) <= endK && keys.length < 366) {
    keys.push(dayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

function bucketByDay(events: any[]): Record<string, any[]> {
  const byDay: Record<string, any[]> = {};
  for (const ev of events) for (const k of eventDayKeys(ev)) (byDay[k] ||= []).push(ev);
  return byDay;
}

// Linha de horário/intervalo exibida em cada item de evento.
function evMeta(ev: any): string {
  if (!ev.allDay) return `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`;
  const sK = dayKey(new Date(ev.start)), eK = dayKey(new Date(ev.end));
  if (eK <= sK) return 'Dia inteiro';
  const short = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS_PT[d.getMonth()].slice(0, 3).toLowerCase()}`; };
  return `Dia inteiro · ${short(ev.start)}–${short(ev.end)}`;
}

// ─── Event Form Modal ───────────────────────────────────────────────────────

function EventModal({ ev, calendars, categories, isAdmin, onClose, onSaved }: any) {
  const isNew = !ev?.id;
  const [form, setForm] = useState<any>({
    title: '', calendarId: calendars[0]?.id || '', category: 'reuniao',
    startDate: todayKey(), endDate: todayKey(), startTime: '09:00', endTime: '10:00',
    allDay: false, location: '', description: '', rrule: '', reminders: '',
    visibility: 'padrao', availability: 'OCUPADO', videoConfLink: '', guests: [], attachments: [],
    linkedCalendarIds: [],
    ...( ev
      ? {
          ...ev,
          startDate: ev.start ? dayKey(new Date(ev.start)) : (ev.startDate || todayKey()),
          endDate:   ev.end   ? dayKey(new Date(ev.end))   : (ev.start ? dayKey(new Date(ev.start)) : (ev.startDate || todayKey())),
          startTime: ev.start ? fmtTime(ev.start) : '09:00',
          endTime:   ev.end   ? fmtTime(ev.end)   : '10:00',
          rrule: ev.rrule || '',
          // Agendas espelho = todas em que o evento aparece, menos a dona.
          linkedCalendarIds: (ev.calendarIds || []).filter((id: string) => id !== ev.calendarId),
        }
      : {} ),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Abre "Mais opções" automaticamente quando o evento já traz dados nessa seção.
  const [showMore, setShowMore] = useState<boolean>(() => !!(
    (ev?.guests?.length) || (ev?.attachments?.length) || ev?.videoConfLink ||
    (ev?.visibility && ev.visibility !== 'padrao') || (ev?.availability && ev.availability !== 'OCUPADO') ||
    ((ev?.calendarIds || []).filter((id: string) => id !== ev?.calendarId).length)
  ));
  const [guestEmail, setGuestEmail] = useState('');
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [customRem, setCustomRem] = useState('');

  function set(k: string) { return (e: any) => setForm((f: any) => ({ ...f, [k]: e.target ? e.target.value : e })); }
  function setB(k: string) { return (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.checked })); }

  // ── Lembretes: guardados como minutos-antes separados por vírgula (ex.: "10,60") ──
  const REMINDER_PRESETS = [
    { v: 0, label: 'No horário' },
    { v: 10, label: '10 min antes' },
    { v: 30, label: '30 min antes' },
    { v: 60, label: '1 h antes' },
    { v: 1440, label: '1 dia antes' },
  ];
  function reminderMins(): number[] {
    return String(form.reminders || '').split(',').map((s) => s.trim()).filter(Boolean)
      .map(Number).filter((n) => !Number.isNaN(n));
  }
  function setReminderMins(mins: number[]) {
    const uniq = Array.from(new Set(mins)).sort((a, b) => a - b);
    setForm((f: any) => ({ ...f, reminders: uniq.join(',') }));
  }
  function toggleReminder(v: number) {
    const cur = reminderMins();
    setReminderMins(cur.includes(v) ? cur.filter((n) => n !== v) : [...cur, v]);
  }
  function addCustomReminder() {
    const v = Number(customRem.trim());
    if (!customRem.trim() || Number.isNaN(v) || v < 0) return;
    setReminderMins([...reminderMins(), v]);
    setCustomRem('');
  }

  function addGuest() {
    const email = guestEmail.trim();
    if (!email) return;
    setForm((f: any) => ({ ...f, guests: [...(f.guests || []), { email }] }));
    setGuestEmail('');
  }
  function removeGuest(i: number) { setForm((f: any) => ({ ...f, guests: f.guests.filter((_: any, j: number) => j !== i) })); }
  function addAttachment() {
    const name = attName.trim(), url = attUrl.trim();
    if (!name || !url) return;
    setForm((f: any) => ({ ...f, attachments: [...(f.attachments || []), { name, url, provider: 'link' }] }));
    setAttName(''); setAttUrl('');
  }
  function removeAttachment(i: number) { setForm((f: any) => ({ ...f, attachments: f.attachments.filter((_: any, j: number) => j !== i) })); }
  async function sendInvites() {
    if (isNew) return;
    setInviteMsg('Enviando...');
    try {
      const r = await api(`/events/${ev.id}/invite`, { method: 'POST' });
      const sent = r.results.filter((x: any) => x.sent).length;
      setInviteMsg(r.configured
        ? `Convites enviados: ${sent}/${r.results.length}.`
        : `SMTP não configurado — ${r.results.length} convite(s) simulado(s). Defina SMTP_HOST/PORT/USER/PASS no servidor.`);
    } catch (e: any) { setInviteMsg(e.message); }
  }
  async function generateMeet() {
    if (isNew) { setInviteMsg('Salve o evento antes de gerar o Meet.'); return; }
    try {
      const r = await api(`/events/${ev.id}/meet`, { method: 'POST' });
      setForm((f: any) => ({ ...f, videoConfLink: r.videoConfLink }));
    } catch (e: any) { alert(e.message); }
  }
  async function attachFromDrive() {
    try {
      const t = await api('/google/token'); // 400 se a conta Google não estiver conectada
      const file = await pickDriveFile(t.accessToken, t.apiKey);
      if (file) setForm((f: any) => ({ ...f, attachments: [...(f.attachments || []), { name: file.name, url: file.url, provider: 'drive', mimeType: file.mimeType }] }));
    } catch (e: any) { alert(e.message + '\nConecte sua conta Google em Mais → Preferências.'); }
  }

  // Permissão: a agenda institucional é editável apenas por administradores.
  const calType = calendars.find((c: any) => c.id === form.calendarId)?.type;
  const readOnly = !isNew && calType === 'INSTITUCIONAL' && !isAdmin;
  // Agendas que o usuário pode escolher como dona (não-admin não cria/move para institucional).
  const ownerCalendars = calendars.filter((c: any) => isAdmin || c.type !== 'INSTITUCIONAL' || c.id === form.calendarId);
  // Agendas espelho disponíveis (exclui a dona e, para não-admin, a institucional).
  const mirrorCalendars = calendars.filter((c: any) => c.id !== form.calendarId && (isAdmin || c.type !== 'INSTITUCIONAL'));

  // Categorias visíveis = as do tipo da agenda selecionada + as de escopo TODAS.
  const allCats = (categories && categories.length) ? categories : [];
  let catOptions = allCats.filter((c: any) => !calType || c.scope === calType || c.scope === 'TODAS');
  // Garante que a categoria atual apareça mesmo se fora do escopo (ex.: evento antigo).
  if (form.category && !catOptions.some((c: any) => c.key === form.category)) {
    catOptions = [{ key: form.category, label: getCatLabel(form.category) }, ...catOptions];
  }

  async function save() {
    if (readOnly) return; // agenda institucional é somente leitura para não-admin
    if (!form.title.trim()) { setError('Informe o título do evento.'); return; }
    if (!form.calendarId) { setError('Selecione a agenda do evento.'); return; }
    if (!form.startDate) { setError('Informe a data do evento.'); return; }
    // Horários têm um padrão seguro para nunca montar uma data ISO inválida (ex.: "T:00").
    const startTime = (!form.allDay && form.startTime) ? form.startTime : '09:00';
    const endTime   = (!form.allDay && form.endTime)   ? form.endTime   : '10:00';
    const start = form.allDay ? `${form.startDate}T00:00:00` : `${form.startDate}T${startTime}:00`;
    const endDate = (form.allDay && form.endDate && form.endDate >= form.startDate) ? form.endDate : form.startDate;
    const end = form.allDay ? `${endDate}T23:59:00` : `${form.startDate}T${endTime}:00`;
    if (Number.isNaN(new Date(start).getTime()) || Number.isNaN(new Date(end).getTime())) {
      setError('Data ou horário inválido. Verifique os campos de data/hora.'); return;
    }
    // Agendas adicionais onde o evento também aparece (espelho), exceto a agenda dona.
    const linkedCalendarIds = (form.linkedCalendarIds || []).filter((id: string) => id && id !== form.calendarId);
    setSaving(true); setError('');
    try {
      const body = {
        calendarId: form.calendarId, title: form.title.trim(),
        description: form.description || null, location: form.location || null,
        category: form.category, rrule: form.rrule || null, reminders: form.reminders || null,
        visibility: form.visibility, availability: form.availability,
        videoConfLink: form.videoConfLink || null,
        linkedCalendarIds,
        guests: (form.guests || []).map((g: any) => ({ email: g.email, name: g.name || null })),
        attachments: (form.attachments || []).map((a: any) => ({ name: a.name, url: a.url, provider: a.provider || 'link', mimeType: a.mimeType || null })),
        allDay: form.allDay,
        start,
        end,
      };
      const saved = isNew
        ? await api('/events', { method: 'POST', body })
        : await api(`/events/${ev.id}`, { method: 'PUT', body });
      // Ao criar um evento já com convidados, dispara os convites automaticamente.
      if (isNew && saved?.id && (form.guests?.length)) {
        try { await api(`/events/${saved.id}/invite`, { method: 'POST' }); } catch { /* convite é best-effort */ }
      }
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
          <h2 className="modal-title">{isNew ? 'Novo evento' : (readOnly ? 'Evento' : 'Editar evento')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          {readOnly && (
            <div className="form-hint" style={{ marginBottom: 12, padding: '9px 12px', background: '#eef6f6', border: '1px solid #bfe0e0', borderRadius: 7, color: '#0F5C5E' }}>
              <Ionicons name="lock-closed" size={12} color="#0F5C5E" /> Agenda institucional — somente leitura. A edição é exclusiva de administradores.
            </div>
          )}

          <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, minInlineSize: 'auto' }}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Ex.: Reunião mensal" autoFocus />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Agenda</label>
              <select className="form-select" value={form.calendarId} onChange={set('calendarId')}>
                {ownerCalendars.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                {catOptions.map((c: any) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Espelho de agendas: o mesmo evento aparece também nas agendas marcadas. */}
          {mirrorCalendars.length > 0 && (
            <div className="form-group">
              <label className="form-label">Também aparece em</label>
              <div className="chip-row">
                {mirrorCalendars.map((c: any) => {
                  const on = (form.linkedCalendarIds || []).includes(c.id);
                  return (
                    <span
                      key={c.id}
                      className={`chip${on ? ' selected' : ''}`}
                      onClick={() => setForm((f: any) => {
                        const cur = f.linkedCalendarIds || [];
                        return { ...f, linkedCalendarIds: on ? cur.filter((x: string) => x !== c.id) : [...cur, c.id] };
                      })}
                    >{c.name}</span>
                  );
                })}
              </div>
              <div className="form-hint">É o mesmo evento espelhado: editar ou excluir reflete em todas as agendas marcadas.</div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{form.allDay ? 'Data início' : 'Data'}</label>
              <input className="form-input" type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            {form.allDay && (
              <div className="form-group">
                <label className="form-label">Data fim</label>
                <input className="form-input" type="date" value={form.endDate} min={form.startDate} onChange={set('endDate')} />
              </div>
            )}
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
            <label className="form-label">Lembretes</label>
            <div className="form-hint" style={{ marginTop: 0, marginBottom: 6 }}>Avisar antes do evento (uma notificação para cada opção marcada).</div>
            <div className="chip-row">
              {REMINDER_PRESETS.map((p) => {
                const on = reminderMins().includes(p.v);
                return <span key={p.v} className={`chip${on ? ' selected' : ''}`} onClick={() => toggleReminder(p.v)}>{p.label}</span>;
              })}
              {/* Lembretes personalizados (valores fora dos presets) aparecem como chips removíveis. */}
              {reminderMins().filter((n) => !REMINDER_PRESETS.some((p) => p.v === n)).map((n) => (
                <span key={n} className="chip selected" onClick={() => toggleReminder(n)}>{n} min antes ✕</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <input className="form-input" type="number" min={0} placeholder="Outro (min antes)" value={customRem}
                onChange={(e) => setCustomRem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomReminder(); } }}
                style={{ flex: '0 0 60%' }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={addCustomReminder}>Adicionar</button>
            </div>
          </div>

          <div className="divider" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowMore(s => !s)} style={{ marginBottom: 8 }}>
            {showMore ? '▲' : '▼'} Mais opções
          </button>

          {showMore && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Visibilidade</label>
                  <select className="form-select" value={form.visibility} onChange={set('visibility')}>
                    <option value="padrao">Padrão</option>
                    <option value="publico">Público</option>
                    <option value="privado">Privado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Disponibilidade</label>
                  <select className="form-select" value={form.availability} onChange={set('availability')}>
                    <option value="OCUPADO">Ocupado</option>
                    <option value="LIVRE">Livre</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Convidados</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" type="email" placeholder="email@exemplo.com" value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={addGuest}>Adicionar</button>
                </div>
                {form.guests?.length > 0 && (
                  <div className="chip-row" style={{ marginTop: 8 }}>
                    {form.guests.map((g: any, i: number) => (
                      <span key={i} className="chip selected" style={{ cursor: 'default' }}>
                        {g.email}<span style={{ marginLeft: 6, cursor: 'pointer' }} onClick={() => removeGuest(i)}>✕</span>
                      </span>
                    ))}
                  </div>
                )}
                {!isNew && form.guests?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={sendInvites}>Reenviar convites por e-mail</button>
                    {inviteMsg && <div className="form-hint" style={{ marginTop: 6 }}>{inviteMsg}</div>}
                  </div>
                )}
                {form.guests?.length > 0 && (
                  <div className="form-hint">
                    {isNew
                      ? 'Os convites serão enviados automaticamente por e-mail assim que você salvar o evento.'
                      : 'Convites já podem ser enviados. Use "Reenviar" após alterar a lista de convidados.'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Videoconferência</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" placeholder="https://meet.google.com/..." value={form.videoConfLink || ''} onChange={set('videoConfLink')} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={generateMeet} title="Cria um Meet no seu Google Calendar (requer conta Google conectada)">Gerar Meet</button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Anexos (link)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" placeholder="Nome" value={attName} onChange={e => setAttName(e.target.value)} style={{ flex: '0 0 30%' }} />
                  <input className="form-input" placeholder="https://..." value={attUrl} onChange={e => setAttUrl(e.target.value)} />
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
                        <Ionicons name="attach-outline" size={14} color="#52606D" />
                        <a href={a.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</a>
                        <span style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => removeAttachment(i)}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-hint">Cole um link manual ou use "Anexar do Drive" (requer conta Google conectada).</div>
              </div>
            </>
          )}
          </fieldset>
        </div>
        <div className="modal-footer">
          {readOnly ? (
            <>
              <span style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={onClose}>Fechar</button>
            </>
          ) : (
            <>
              {!isNew && <button className="btn btn-danger btn-sm" onClick={remove}>Excluir</button>}
              <span style={{ flex: 1 }} />
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Monthly view ───────────────────────────────────────────────────────────

// Uma semana da grade mensal. Eventos multi-dia (allDay) viram barras contínuas que
// atravessam as colunas (lanes empilhadas); os demais aparecem como chips no dia.
function WeekRow({ week, spans, byDaySingle, selected, today, setSelected, onNewAt, onEditEv }: any) {
  const weekKeys: (string | null)[] = week.map((d: Date | null) => (d ? dayKey(d) : null));
  const firstK = weekKeys.find(Boolean) as string | undefined;
  const lastK = [...weekKeys].reverse().find(Boolean) as string | undefined;

  // Segmentos de barras que intersectam esta semana, recortados às colunas válidas.
  const segs: any[] = [];
  if (firstK && lastK) {
    for (const ev of spans) {
      const startK = dayKey(new Date(ev.start));
      const endK = dayKey(new Date(ev.end));
      if (endK < firstK || startK > lastK) continue;
      let cs = 0; while (cs < 7 && (weekKeys[cs] === null || (weekKeys[cs] as string) < startK)) cs++;
      let ce = 6; while (ce >= 0 && (weekKeys[ce] === null || (weekKeys[ce] as string) > endK)) ce--;
      if (cs > ce || cs > 6 || ce < 0) continue;
      segs.push({ ev, cs, ce, roundL: weekKeys[cs] === startK, roundR: weekKeys[ce] === endK });
    }
  }
  // Empacota em lanes (faixas) sem sobreposição horizontal.
  segs.sort((a, b) => a.cs - b.cs || (b.ce - b.cs) - (a.ce - a.cs));
  const lanes: any[][] = [];
  for (const s of segs) {
    let li = lanes.findIndex((lane) => lane.every((o: any) => s.cs > o.ce || s.ce < o.cs));
    if (li === -1) { li = lanes.length; lanes.push([]); }
    lanes[li].push(s); s.lane = li;
  }
  // Geometria das barras: ficam logo abaixo do número; os chips do dia são empurrados
  // para baixo da faixa de barras (reserva = nº de lanes × altura).
  const SPAN_H = 19;          // altura da barra + respiro
  const BAND_TOP = 30;        // início da faixa, abaixo do número
  const bandReserve = lanes.length * SPAN_H;
  const MAX_CHIPS = 3;        // limite de chips visíveis por dia; excedente vira "+N"

  return (
    <div className="cal-week">
      {/* Células do dia: número no topo, chips empilhados abaixo da faixa de barras */}
      {week.map((d: Date | null, i: number) => {
        if (!d) return <div key={i} className="cal-cell other-month" />;
        const k = dayKey(d);
        const evs = byDaySingle[k] || [];
        return (
          <div key={i} className={`cal-cell${k === selected ? ' selected' : ''}`}
            onClick={() => setSelected(k)} onDoubleClick={() => onNewAt(k)}>
            <span className={`day-num${k === today ? ' today-num' : ''}`}>{d.getDate()}</span>
            <div className="cal-cell-evs" style={{ marginTop: bandReserve }}>
              {evs.slice(0, MAX_CHIPS).map((ev: any, j: number) => (
                <div key={j} className="day-ev" style={{ background: getCatColor(ev.category) }}
                  onClick={(e) => { e.stopPropagation(); onEditEv(ev); }} title={ev.title}>{ev.title}</div>
              ))}
              {evs.length > MAX_CHIPS && <div className="day-more">+{evs.length - MAX_CHIPS} mais</div>}
            </div>
          </div>
        );
      })}
      {/* Overlay das barras contínuas multi-dia (posicionadas por porcentagem das colunas) */}
      <div className="cal-week-spans">
        {segs.map((s: any, idx: number) => {
          const insetL = s.roundL ? 2 : 0;
          const insetR = s.roundR ? 2 : 0;
          return (
            <div key={'s' + idx} className="cal-span"
              style={{
                left: `calc(${s.cs} * 100% / 7 + ${insetL}px)`,
                width: `calc(${s.ce - s.cs + 1} * 100% / 7 - ${insetL + insetR}px)`,
                top: BAND_TOP + s.lane * SPAN_H,
                background: getCatColor(s.ev.category),
                borderTopLeftRadius: s.roundL ? 4 : 0, borderBottomLeftRadius: s.roundL ? 4 : 0,
                borderTopRightRadius: s.roundR ? 4 : 0, borderBottomRightRadius: s.roundR ? 4 : 0,
              }}
              title={s.ev.title}
              onClick={(e) => { e.stopPropagation(); onEditEv(s.ev); }}>
              <span className="cal-span-label">{s.roundL ? s.ev.title : `↤ ${s.ev.title}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  const byDay = bucketByDay(events);           // painel lateral: tudo, por dia
  const dayEvs = byDay[selected] || [];

  // Multi-dia → barras contínuas; demais → chips por dia.
  const spans = events.filter(isMultiDaySpan);
  const byDaySingle = bucketByDay(events.filter((e: any) => !isMultiDaySpan(e)));
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="cal-split">
      <div>
        {/* Calendar grid */}
        <div className="cal-month">
          <div className="cal-grid-head">
            {WDAYS_SHORT.map((w,i) => <div key={i} className="cal-wday">{w}</div>)}
          </div>
          <div className="cal-weeks">
            {weeks.map((week, wi) => (
              <WeekRow key={wi} week={week} spans={spans} byDaySingle={byDaySingle}
                selected={selected} today={today}
                setSelected={setSelected} onNewAt={onNewAt} onEditEv={onEditEv} />
            ))}
          </div>
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
                {dayEvs.map((ev: any, i: number) => (
                  <div key={`${ev.id}-${i}`} className="ev-item" onClick={() => onEditEv(ev)}>
                    <div className="ev-bar" style={{ background: getCatColor(ev.category) }} />
                    <div className="ev-info">
                      <div className="ev-title">{ev.title}{ev.occurrence ? ' ↻' : ''}</div>
                      <div className="ev-meta">
                        {evMeta(ev)}
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
  const grouped = bucketByDay(events);
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
              {grouped[k].map((ev: any, i: number) => (
                <div key={`${ev.id}-${i}`} className="ev-item" onClick={() => onEdit(ev)}>
                  <div className="ev-bar" style={{ background: getCatColor(ev.category) }} />
                  <div className="ev-info">
                    <div className="ev-title">{ev.title}{ev.occurrence ? ' ↻' : ''}</div>
                    <div className="ev-meta">
                      {evMeta(ev)}
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
                {evs.map((ev: any, i: number) => (
                  <div key={`${ev.id}-${i}`} className="ev-item" onClick={() => onEdit(ev)}>
                    <div className="ev-bar" style={{ background: color }} />
                    <div className="ev-info">
                      <div className="ev-title">{ev.title}</div>
                      <div className="ev-meta">{fmtDate(ev.start)} · {evMeta(ev)}</div>
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

function AnnualView({ year, events, onDayClick, onMonthClick }: any) {
  const today = todayKey();
  const byDay: Record<string, number> = {};
  for (const ev of events) for (const k of eventDayKeys(ev)) byDay[k] = (byDay[k]||0)+1;

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
            <div className="mini-cal-title mini-cal-link" onClick={() => onMonthClick(m)} title="Abrir mês">{MONTHS_PT[m]}</div>
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
  const [cats, setCats] = useState<any[]>([]);
  const [prefs, setPrefs] = useState(getPrefs());
  const [admin, setAdmin] = useState(getIsAdmin());
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<any>(null); // null | 'new' | event object
  const [loading, setLoading] = useState(false);
  const [showAgendas, setShowAgendas] = useState(false); // popover de visibilidade de agendas

  // FAB global: ?new=<ts> abre o modal de novo evento
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { if (newParam) setModal({ _newDate: selected }); }, [newParam]);

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
      // Oculta as agendas marcadas pelo usuário. (useInstitutional legado: oculta a institucional.)
      const hidden = new Set<string>(prefs.hiddenCalendarIds || []);
      if (prefs.useInstitutional === false) {
        for (const c of calendars) if (c.type === 'INSTITUCIONAL') hidden.add(c.id);
      }
      if (hidden.size && calendars.length) {
        const visible = calendars.filter((c: any) => !hidden.has(c.id)).map((c: any) => c.id);
        params.set('calendarIds', visible.join(',') || '__none__');
      }
      const evs = await api(`/events?${params}`);
      setEvents(evs);
      scheduleEventNotifications(evs, prefs.notificationsEnabled);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [month, view, query, year, prefs, calendars]);

  useEffect(() => {
    api('/calendars').then(setCalendars).catch(()=>{});
    api('/categories').then((list) => { setCategories(list); setCats(list); }).catch(()=>{});
    loadPrefs().then((p) => { setPrefs(p); setAdmin(getIsAdmin()); if (p.notificationsEnabled) requestNotificationPermission(); });
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function prevMonth() { setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1)); }
  function nextMonth() { setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1)); }
  function prevYear() { setMonth(new Date(year-1, month.getMonth(), 1)); }
  function nextYear() { setMonth(new Date(year+1, month.getMonth(), 1)); }
  function goToday() { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(dayKey(today)); }

  function onSaved() { setModal(null); loadEvents(); }
  // Ao editar uma ocorrência de evento recorrente, abre a série mestre com a data
  // original (masterStart/masterEnd) para não deslocar a série ao salvar.
  function onEditEv(ev: any) {
    if (ev.occurrence && ev.masterStart) {
      setModal({ ...ev, start: ev.masterStart, end: ev.masterEnd, occurrence: false });
    } else setModal(ev);
  }
  function onNewAt(date: string) { setModal({ _newDate: date }); }
  // Visão anual: clicar no dia abre o mês com o dia selecionado (eventos no painel lateral).
  function onAnnualDay(k: string) {
    const [y,m] = k.split('-').map(Number);
    setMonth(new Date(y, m-1, 1));
    setSelected(k);
    setView('mensal');
  }
  // Visão anual: clicar no nome do mês abre a visão mensal daquele mês.
  function onAnnualMonth(m: number) {
    setMonth(new Date(year, m, 1));
    setView('mensal');
  }

  // Oculta/exibe uma agenda na visualização. Usuário comum não pode ocultar a institucional.
  async function toggleCalendarHidden(calId: string, type: string) {
    if (!admin && type === 'INSTITUCIONAL') return;
    const cur = new Set<string>(prefs.hiddenCalendarIds || []);
    if (cur.has(calId)) cur.delete(calId); else cur.add(calId);
    const next = await savePrefs({ hiddenCalendarIds: [...cur] });
    setPrefs(next);
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
          {/* Visibilidade de agendas */}
          {calendars.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAgendas(s => !s)}>
                <Ionicons name="layers-outline" size={14} color="#52606D" /> Agendas
                {(prefs.hiddenCalendarIds?.length ? ` (${calendars.length - prefs.hiddenCalendarIds.length}/${calendars.length})` : '')}
              </button>
              {showAgendas && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowAgendas(false)} />
                  <div className="agenda-pop">
                    <div className="agenda-pop-title">Mostrar agendas</div>
                    {calendars.map((c: any) => {
                      const hidden = (prefs.hiddenCalendarIds || []).includes(c.id);
                      const locked = !admin && c.type === 'INSTITUCIONAL';
                      return (
                        <label key={c.id} className={`agenda-pop-item${locked ? ' locked' : ''}`}>
                          <input type="checkbox" checked={!hidden} disabled={locked}
                            onChange={() => toggleCalendarHidden(c.id, c.type)} />
                          <span className="agenda-dot" style={{ background: c.color || '#1a73e8' }} />
                          <span style={{ flex: 1 }}>{c.name}</span>
                          {locked && <Ionicons name="lock-closed" size={12} color="#9AA0A6" />}
                        </label>
                      );
                    })}
                    {!admin && <div className="form-hint" style={{ padding: '4px 12px 8px' }}>A agenda institucional não pode ser ocultada.</div>}
                  </div>
                </>
              )}
            </div>
          )}
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
      {view === 'anual' && <AnnualView year={year} events={events} onDayClick={onAnnualDay} onMonthClick={onAnnualMonth} />}

      {/* Modal */}
      {modal && (
        <EventModal
          ev={modal._newDate ? { startDate: modal._newDate } : modal}
          calendars={calendars}
          categories={cats}
          isAdmin={admin}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
