import { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { colors } from '../../src/theme';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [calendars, setCalendars] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setTasks(await api('/tasks'));
      setCalendars(await api('/calendars'));
    } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    if (!title.trim() || !calendars.length) return;
    await api('/tasks', { method: 'POST', body: { calendarId: calendars[0].id, title: title.trim() } });
    setTitle('');
    load();
  }

  async function toggle(t: any) {
    await api(`/tasks/${t.id}`, { method: 'PUT', body: { done: !t.done } });
    load();
  }

  async function remove(t: any) {
    await api(`/tasks/${t.id}`, { method: 'DELETE' });
    load();
  }

  const PRIORITY_COLOR: any = { ALTA: colors.red, MEDIA: colors.yellow, BAIXA: colors.green };

  return (
    <View style={s.container}>
      <View style={s.addRow}>
        <TextInput
          style={s.input} placeholder="Nova tarefa..." placeholderTextColor={colors.muted}
          value={title} onChangeText={setTitle} onSubmitEditing={add}
        />
        <TouchableOpacity style={s.addBtn} onPress={add}><Text style={s.addText}>＋</Text></TouchableOpacity>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={s.empty}>Nenhuma tarefa</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity onPress={() => toggle(item)}>
              <Text style={s.check}>{item.done ? '☑' : '☐'}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, item.done && s.done]}>{item.title}</Text>
              <Text style={s.meta}>
                <Text style={{ color: PRIORITY_COLOR[item.priority] || colors.muted }}>{item.priority}</Text>
                {item.dueDate ? ` · até ${new Date(item.dueDate).toLocaleDateString('pt-BR')}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => remove(item)}><Text style={s.del}>🗑</Text></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 8, padding: 12, color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, width: 48, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  check: { fontSize: 22, color: colors.primary },
  title: { color: colors.text, fontSize: 15 },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  del: { fontSize: 16, opacity: 0.7 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
});
