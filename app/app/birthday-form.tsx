import { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/api';
import { Field, Choice, FormScreen, f } from '../src/form';

export default function BirthdayForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [bd, setBd] = useState<any>({ calendarId: '', name: '', birthDate: '', phone: '', notes: '' });

  useEffect(() => {
    api('/calendars').then((cals) => {
      setCalendars(cals);
      if (!id && cals.length) setBd((b: any) => ({ ...b, calendarId: b.calendarId || cals[0].id }));
    });
    if (id) {
      api('/birthdays').then((all) => {
        const found = all.find((x: any) => x.id === id);
        if (found) setBd({ ...found, birthDate: new Date(found.birthDate).toISOString().slice(0, 10) });
      });
    }
  }, [id]);

  async function save() {
    setError('');
    try {
      const body = { calendarId: bd.calendarId, name: bd.name, birthDate: bd.birthDate, phone: bd.phone, notes: bd.notes };
      if (id) await api(`/birthdays/${id}`, { method: 'PUT', body });
      else await api('/birthdays', { method: 'POST', body });
      router.back();
    } catch (e: any) { setError(e.message); }
  }

  async function remove() {
    await api(`/birthdays/${id}`, { method: 'DELETE' });
    router.back();
  }

  return (
    <FormScreen>
      {!!error && <Text style={f.error}>{error}</Text>}
      <Field label="Nome *" value={bd.name} onChange={(v: string) => setBd({ ...bd, name: v })} />
      <Field label="Data de nascimento (AAAA-MM-DD) *" value={bd.birthDate} onChange={(v: string) => setBd({ ...bd, birthDate: v })} placeholder="2010-05-20" />
      <Choice label="Agenda" options={calendars.map((c) => ({ key: c.id, label: c.name }))} value={bd.calendarId} onChange={(v) => setBd({ ...bd, calendarId: v })} />
      <Field label="Telefone" value={bd.phone} onChange={(v: string) => setBd({ ...bd, phone: v })} keyboardType="phone-pad" />
      <Field label="Observações" value={bd.notes} onChange={(v: string) => setBd({ ...bd, notes: v })} multiline />
      <Text style={{ color: '#9aa0a6', marginBottom: 10 }}>A classificação (Criança 0–11, Jovem 12–17, Adulto 18+) é calculada automaticamente.</Text>
      <TouchableOpacity style={f.save} onPress={save}><Text style={f.saveText}>Salvar</Text></TouchableOpacity>
      {!!id && <TouchableOpacity style={f.delete} onPress={remove}><Text style={f.deleteText}>Excluir</Text></TouchableOpacity>}
    </FormScreen>
  );
}
