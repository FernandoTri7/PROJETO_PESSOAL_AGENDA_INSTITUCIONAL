import { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/api';
import { CATEGORIES } from '../src/theme';
import { Field, Choice, FormScreen, f } from '../src/form';

const RECURRENCES = [
  { key: '', label: 'Não repete' },
  { key: 'FREQ=DAILY', label: 'Diário' },
  { key: 'FREQ=WEEKLY', label: 'Semanal' },
  { key: 'FREQ=WEEKLY;INTERVAL=2', label: 'Quinzenal' },
  { key: 'FREQ=MONTHLY', label: 'Mensal' },
  { key: 'FREQ=YEARLY', label: 'Anual' },
];

export default function EventForm() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [ev, setEv] = useState<any>({
    title: '', calendarId: '', category: 'OUTRO', rrule: '',
    startDate: date || new Date().toISOString().slice(0, 10), startTime: '09:00',
    endTime: '10:00', location: '', description: '', reminders: '',
  });

  useEffect(() => {
    api('/calendars').then((cals) => {
      setCalendars(cals);
      if (!id && cals.length) setEv((e: any) => ({ ...e, calendarId: e.calendarId || cals[0].id }));
    });
    if (id) {
      api(`/events?from=1900-01-01&to=2200-01-01`).then((all) => {
        const found = all.find((x: any) => x.id === id);
        if (found) {
          const st = new Date(found.start);
          const en = new Date(found.end);
          setEv({
            ...found,
            rrule: found.rrule || '',
            startDate: st.toISOString().slice(0, 10),
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
        start: `${ev.startDate}T${ev.startTime || '00:00'}:00`,
        end: `${ev.startDate}T${ev.endTime || ev.startTime || '00:00'}:00`,
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

  return (
    <FormScreen>
      {!!error && <Text style={f.error}>{error}</Text>}
      <Field label="Título *" value={ev.title} onChange={(v: string) => setEv({ ...ev, title: v })} placeholder="Ex.: Reunião mensal" />
      <Choice label="Agenda" options={calendars.map((c) => ({ key: c.id, label: c.name }))} value={ev.calendarId} onChange={(v) => setEv({ ...ev, calendarId: v })} />
      <Field label="Data (AAAA-MM-DD)" value={ev.startDate} onChange={(v: string) => setEv({ ...ev, startDate: v })} placeholder="2026-06-09" />
      <Field label="Início (HH:MM)" value={ev.startTime} onChange={(v: string) => setEv({ ...ev, startTime: v })} placeholder="09:00" />
      <Field label="Fim (HH:MM)" value={ev.endTime} onChange={(v: string) => setEv({ ...ev, endTime: v })} placeholder="10:00" />
      <Choice label="Categoria" options={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))} value={ev.category} onChange={(v) => setEv({ ...ev, category: v })} />
      <Choice label="Recorrência" options={RECURRENCES} value={ev.rrule} onChange={(v) => setEv({ ...ev, rrule: v })} />
      <Field label="Local" value={ev.location} onChange={(v: string) => setEv({ ...ev, location: v })} />
      <Field label="Lembretes (minutos antes, ex.: 10,60)" value={ev.reminders} onChange={(v: string) => setEv({ ...ev, reminders: v })} keyboardType="numeric" />
      <Field label="Descrição" value={ev.description} onChange={(v: string) => setEv({ ...ev, description: v })} multiline />
      <TouchableOpacity style={f.save} onPress={save}><Text style={f.saveText}>Salvar</Text></TouchableOpacity>
      {!!id && <TouchableOpacity style={f.delete} onPress={remove}><Text style={f.deleteText}>Excluir evento</Text></TouchableOpacity>}
    </FormScreen>
  );
}
