import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/api';
import { getCatLabel, setCategories } from '../src/theme';
import { Field, Choice, FormScreen, f } from '../src/form';

const RECURRENCES = [
  { key: '', label: 'Não repete' },
  { key: 'FREQ=DAILY', label: 'Diário' },
  { key: 'FREQ=WEEKLY', label: 'Semanal' },
  { key: 'FREQ=WEEKLY;INTERVAL=2', label: 'Quinzenal' },
  { key: 'FREQ=MONTHLY', label: 'Mensal' },
  { key: 'FREQ=YEARLY', label: 'Anual' },
];

const ALLDAY_OPTS = [{ key: 'nao', label: 'Não' }, { key: 'sim', label: 'Sim' }];
const VISIBILITY_OPTS = [{ key: 'padrao', label: 'Padrão' }, { key: 'publico', label: 'Público' }, { key: 'privado', label: 'Privado' }];
const AVAIL_OPTS = [{ key: 'OCUPADO', label: 'Ocupado' }, { key: 'LIVRE', label: 'Livre' }];

// Data local no formato AAAA-MM-DD (sem conversão de fuso, ao contrário de toISOString).
function localDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EventForm() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [ev, setEv] = useState<any>({
    title: '', calendarId: '', category: 'OUTRO', rrule: '',
    allDay: false,
    startDate: date || localDay(new Date()), endDate: date || localDay(new Date()),
    startTime: '09:00', endTime: '10:00', location: '', description: '', reminders: '',
    visibility: 'padrao', availability: 'OCUPADO', videoConfLink: '', guests: [], attachments: [],
  });
  const [guestEmail, setGuestEmail] = useState('');
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');

  useEffect(() => {
    api('/calendars').then((cals) => {
      setCalendars(cals);
      if (!id && cals.length) setEv((e: any) => ({ ...e, calendarId: e.calendarId || cals[0].id }));
    });
    api('/categories').then((list) => { setCategories(list); setCats(list); }).catch(() => {});
    if (id) {
      api(`/events?from=1900-01-01&to=2200-01-01`).then((all) => {
        const found = all.find((x: any) => x.id === id);
        if (found) {
          const st = new Date(found.start);
          const en = new Date(found.end);
          setEv({
            ...found,
            rrule: found.rrule || '',
            allDay: !!found.allDay,
            startDate: localDay(st),
            endDate: localDay(en),
            startTime: st.toTimeString().slice(0, 5),
            endTime: en.toTimeString().slice(0, 5),
          });
        }
      });
    }
  }, [id]);

  async function save() {
    setError('');
    try {
      const body = {
        calendarId: ev.calendarId,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        category: ev.category,
        rrule: ev.rrule || null,
        reminders: ev.reminders || null,
        allDay: ev.allDay,
        visibility: ev.visibility,
        availability: ev.availability,
        videoConfLink: ev.videoConfLink || null,
        guests: (ev.guests || []).map((g: any) => ({ email: g.email, name: g.name || null })),
        attachments: (ev.attachments || []).map((a: any) => ({ name: a.name, url: a.url, provider: a.provider || 'link', mimeType: a.mimeType || null })),
        start: ev.allDay ? `${ev.startDate}T00:00:00` : `${ev.startDate}T${ev.startTime || '00:00'}:00`,
        end: ev.allDay
          ? `${(ev.endDate && ev.endDate >= ev.startDate) ? ev.endDate : ev.startDate}T23:59:00`
          : `${ev.startDate}T${ev.endTime || ev.startTime || '00:00'}:00`,
      };
      if (id) await api(`/events/${id}`, { method: 'PUT', body });
      else await api('/events', { method: 'POST', body });
      router.back();
    } catch (e: any) { setError(e.message); }
  }

  async function remove() {
    await api(`/events/${id}`, { method: 'DELETE' });
    router.back();
  }

  function addGuest() {
    const email = guestEmail.trim();
    if (!email) return;
    setEv((e: any) => ({ ...e, guests: [...(e.guests || []), { email }] }));
    setGuestEmail('');
  }
  function removeGuest(i: number) { setEv((e: any) => ({ ...e, guests: e.guests.filter((_: any, j: number) => j !== i) })); }
  function addAttachment() {
    const name = attName.trim(), url = attUrl.trim();
    if (!name || !url) return;
    setEv((e: any) => ({ ...e, attachments: [...(e.attachments || []), { name, url, provider: 'link' }] }));
    setAttName(''); setAttUrl('');
  }
  function removeAttachment(i: number) { setEv((e: any) => ({ ...e, attachments: e.attachments.filter((_: any, j: number) => j !== i) })); }

  // Categorias do tipo da agenda selecionada + as de escopo TODAS.
  const calType = calendars.find((c) => c.id === ev.calendarId)?.type;
  let catOptions = cats.filter((c: any) => !calType || c.scope === calType || c.scope === 'TODAS');
  if (ev.category && !catOptions.some((c: any) => c.key === ev.category)) {
    catOptions = [{ key: ev.category, label: getCatLabel(ev.category) }, ...catOptions];
  }

  return (
    <FormScreen>
      {!!error && <Text style={f.error}>{error}</Text>}
      <Field label="Título *" value={ev.title} onChange={(v: string) => setEv({ ...ev, title: v })} placeholder="Ex.: Reunião mensal" />
      <Choice label="Agenda" options={calendars.map((c) => ({ key: c.id, label: c.name }))} value={ev.calendarId} onChange={(v) => setEv({ ...ev, calendarId: v })} />
      <Choice label="Dia inteiro" options={ALLDAY_OPTS} value={ev.allDay ? 'sim' : 'nao'} onChange={(v) => setEv({ ...ev, allDay: v === 'sim' })} />
      <Field label={ev.allDay ? 'Data início (AAAA-MM-DD)' : 'Data (AAAA-MM-DD)'} value={ev.startDate} onChange={(v: string) => setEv({ ...ev, startDate: v })} placeholder="2026-06-09" />
      {ev.allDay
        ? <Field label="Data fim (AAAA-MM-DD)" value={ev.endDate} onChange={(v: string) => setEv({ ...ev, endDate: v })} placeholder="2026-06-09" />
        : (<>
            <Field label="Início (HH:MM)" value={ev.startTime} onChange={(v: string) => setEv({ ...ev, startTime: v })} placeholder="09:00" />
            <Field label="Fim (HH:MM)" value={ev.endTime} onChange={(v: string) => setEv({ ...ev, endTime: v })} placeholder="10:00" />
          </>)}
      <Choice label="Categoria" options={catOptions.map((c: any) => ({ key: c.key, label: c.label }))} value={ev.category} onChange={(v) => setEv({ ...ev, category: v })} />
      <Choice label="Recorrência" options={RECURRENCES} value={ev.rrule} onChange={(v) => setEv({ ...ev, rrule: v })} />
      <Field label="Local" value={ev.location} onChange={(v: string) => setEv({ ...ev, location: v })} />
      <Field label="Lembretes (minutos antes, ex.: 10,60)" value={ev.reminders} onChange={(v: string) => setEv({ ...ev, reminders: v })} keyboardType="numeric" />
      <Field label="Descrição" value={ev.description} onChange={(v: string) => setEv({ ...ev, description: v })} multiline />

      <Choice label="Visibilidade" options={VISIBILITY_OPTS} value={ev.visibility} onChange={(v) => setEv({ ...ev, visibility: v })} />
      <Choice label="Disponibilidade" options={AVAIL_OPTS} value={ev.availability} onChange={(v) => setEv({ ...ev, availability: v })} />

      <Text style={f.label}>Convidados</Text>
      <View style={cf.row}>
        <TextInput style={[f.input, cf.grow]} value={guestEmail} onChangeText={setGuestEmail} placeholder="email@exemplo.com" placeholderTextColor="#9AA0A6" keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={cf.addBtn} onPress={addGuest}><Text style={cf.addText}>+</Text></TouchableOpacity>
      </View>
      {(ev.guests || []).map((g: any, i: number) => (
        <View key={i} style={cf.listRow}>
          <Text style={cf.listText}>{g.email}</Text>
          <TouchableOpacity onPress={() => removeGuest(i)}><Text style={cf.removeText}>✕</Text></TouchableOpacity>
        </View>
      ))}
      <Text style={cf.hint}>O envio de convites por e-mail será habilitado em breve.</Text>

      <Field label="Videoconferência (link)" value={ev.videoConfLink} onChange={(v: string) => setEv({ ...ev, videoConfLink: v })} placeholder="https://meet.google.com/..." />

      <Text style={f.label}>Anexos (link)</Text>
      <View style={cf.row}>
        <TextInput style={[f.input, cf.grow]} value={attName} onChangeText={setAttName} placeholder="Nome" placeholderTextColor="#9AA0A6" />
        <TextInput style={[f.input, cf.grow]} value={attUrl} onChangeText={setAttUrl} placeholder="https://..." placeholderTextColor="#9AA0A6" autoCapitalize="none" />
        <TouchableOpacity style={cf.addBtn} onPress={addAttachment}><Text style={cf.addText}>+</Text></TouchableOpacity>
      </View>
      {(ev.attachments || []).map((a: any, i: number) => (
        <View key={i} style={cf.listRow}>
          <Text style={cf.listText}>{a.name}</Text>
          <TouchableOpacity onPress={() => removeAttachment(i)}><Text style={cf.removeText}>✕</Text></TouchableOpacity>
        </View>
      ))}
      <Text style={cf.hint}>Anexar do Google Drive será habilitado em breve.</Text>

      <TouchableOpacity style={f.save} onPress={save}><Text style={f.saveText}>Salvar</Text></TouchableOpacity>
      {!!id && <TouchableOpacity style={f.delete} onPress={remove}><Text style={f.deleteText}>Excluir evento</Text></TouchableOpacity>}
    </FormScreen>
  );
}

const cf = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  grow: { flex: 1, marginBottom: 0 },
  addBtn: { backgroundColor: '#0F5C5E', borderRadius: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 22, lineHeight: 24 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 4 },
  listText: { color: '#1F2933', fontSize: 14, flex: 1 },
  removeText: { color: '#9AA0A6', fontSize: 16, paddingHorizontal: 8 },
  hint: { color: '#9AA0A6', fontSize: 12, marginBottom: 14, marginTop: 2 },
});
