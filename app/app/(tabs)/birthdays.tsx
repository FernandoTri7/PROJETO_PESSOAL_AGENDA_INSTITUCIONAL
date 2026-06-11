import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { colors } from '../../src/theme';

const GROUPS = [
  { key: '', label: 'Todos' },
  { key: 'CRIANCA', label: 'Crianças (0–11)' },
  { key: 'JOVEM', label: 'Jovens (12–17)' },
  { key: 'ADULTO', label: 'Adultos (18+)' },
];
const GROUP_COLOR: any = { CRIANCA: '#f6bf26', JOVEM: '#33b679', ADULTO: '#1a73e8' };
const GROUP_LABEL: any = { CRIANCA: 'Criança', JOVEM: 'Jovem', ADULTO: 'Adulto' };

export default function Birthdays() {
  const [list, setList] = useState<any[]>([]);
  const [group, setGroup] = useState('');

  const load = useCallback(async () => {
    try {
      setList(await api(`/birthdays${group ? `?group=${group}` : ''}`));
    } catch (e) { console.warn(e); }
  }, [group]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.container}>
      <View style={s.filters}>
        {GROUPS.map((g) => (
          <TouchableOpacity key={g.key} style={[s.chip, group === g.key && s.chipSel]} onPress={() => setGroup(g.key)}>
            <Text style={[s.chipText, group === g.key && s.chipTextSel]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        ListEmptyComponent={<Text style={s.empty}>Nenhum aniversário cadastrado</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/birthday-form', params: { id: item.id } })}>
            <Text style={s.cake}>🎂</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>
                {new Date(item.birthDate).toLocaleDateString('pt-BR')} · {item.age} anos · próximo: {new Date(item.nextBirthday).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: GROUP_COLOR[item.group] }]}>
              <Text style={s.badgeText}>{GROUP_LABEL[item.group]}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 13 },
  chipTextSel: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  cake: { fontSize: 22 },
  name: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
});
