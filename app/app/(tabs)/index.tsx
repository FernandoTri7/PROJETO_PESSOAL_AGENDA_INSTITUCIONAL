import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { colors, CATEGORIES } from '../../src/theme';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Agenda() {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(dayKey(today));
  const [events, setEvents] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const params = new URLSearchParams({ from, to });
    if (query) params.set('q', query);
    try {
      setEvents(await api(`/events?${params}`));
    } catch (e) {
      console.warn(e);
    }
  }, [month, query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const byDay: Record<string, any[]> = {};
  for (const ev of events) {
    const k = dayKey(new Date(ev.start));
    (byDay[k] ||= []).push(ev);
  }

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const dayEvents = byDay[selected] || [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Text style={s.nav}>‹</Text></TouchableOpacity>
        <Text style={s.month}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Text style={s.nav}>›</Text></TouchableOpacity>
      </View>
      <TextInput
        style={s.search} placeholder="Pesquisar eventos..." placeholderTextColor={colors.muted}
        value={query} onChangeText={setQuery} onSubmitEditing={load} returnKeyType="search"
      />
      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => <Text key={i} style={s.weekday}>{w}</Text>)}
      </View>
      <View style={s.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const k = dayKey(d);
          const isSel = k === selected;
          const isToday = k === dayKey(today);
          const evs = byDay[k] || [];
          return (
            <TouchableOpacity key={i} style={[s.cell, isSel && s.cellSel]} onPress={() => setSelected(k)}>
              <Text style={[s.cellText, isToday && s.todayText]}>{d.getDate()}</Text>
              <View style={s.dots}>
                {evs.slice(0, 3).map((ev, j) => (
                  <View key={j} style={[s.dot, { backgroundColor: ev.color || CATEGORIES.find((c) => c.key === ev.category)?.color || colors.muted }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.sectionTitle}>Eventos de {selected.split('-').reverse().join('/')}</Text>
      <FlatList
        data={dayEvents}
        keyExtractor={(item, i) => item.id + i}
        ListEmptyComponent={<Text style={s.empty}>Nenhum evento neste dia</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.eventCard}
            onPress={() => !item.occurrence && router.push({ pathname: '/event-form', params: { id: item.id } })}
          >
            <View style={[s.eventBar, { backgroundColor: item.color || CATEGORIES.find((c) => c.key === item.category)?.color || colors.muted }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>{item.title}{item.occurrence ? ' ↻' : ''}</Text>
              <Text style={s.eventTime}>
                {item.allDay ? 'Dia inteiro' : `${new Date(item.start).toTimeString().slice(0, 5)} – ${new Date(item.end).toTimeString().slice(0, 5)}`}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => router.push({ pathname: '/event-form', params: { date: selected } })}>
        <Text style={s.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nav: { color: colors.text, fontSize: 28, paddingHorizontal: 16 },
  month: { color: colors.text, fontSize: 18, fontWeight: '600' },
  search: { backgroundColor: colors.card, borderRadius: 8, padding: 10, color: colors.text, marginBottom: 8 },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1.1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary },
  cellText: { color: colors.text },
  todayText: { color: colors.primary, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  sectionTitle: { color: colors.muted, marginVertical: 8, fontSize: 13, textTransform: 'uppercase' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 16 },
  eventCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  eventBar: { width: 4, borderRadius: 2 },
  eventTitle: { color: colors.text, fontWeight: '600' },
  eventTime: { color: colors.muted, fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
