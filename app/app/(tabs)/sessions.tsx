import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { colors } from '../../src/theme';

const TYPE_LABEL: any = {
  ESCALA: 'Escala', ESCALA_ANUAL: 'Escala Anual', INSTRUTIVA: 'Instrutiva', EXTRA: 'Extra',
  ADVENTICIOS: 'Adventícios', DIRECAO: 'Direção', QUADRO_DE_MESTRES: 'Quadro de Mestres',
  COMEMORATIVA: 'Comemorativa', OUTRA: 'Outra',
};

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await api('/sessions'));
      setStats(await api('/sessions/stats'));
    } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.container}>
      {stats && (
        <View style={s.statsRow}>
          <Stat label="Sessões" value={stats.totalSessoes} />
          <Stat label="Coado (L)" value={stats.coadoLitros?.toFixed(1)} />
          <Stat label="Retorno (L)" value={stats.retornoLitros?.toFixed(1)} />
          <Stat label="Copos" value={(stats.coposSimples || 0) + (stats.coposDuplos || 0) + (stats.coposCriancas || 0)} />
        </View>
      )}
      <FlatList
        data={sessions}
        keyExtractor={(x) => x.id}
        ListEmptyComponent={<Text style={s.empty}>Nenhuma sessão registrada</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/session-form', params: { id: item.id } })}>
            <View style={s.cardHeader}>
              <Text style={s.title}>{item.title || TYPE_LABEL[item.type] || item.type}</Text>
              <Text style={s.date}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
            </View>
            <Text style={s.meta}>
              {[item.dirigente && `Dirigente: ${item.dirigente}`, item.assistente && `Assistente: ${item.assistente}`].filter(Boolean).join(' · ')}
            </Text>
            <Text style={s.meta}>
              {[
                item.coadoLitros != null && `Coado ${item.coadoLitros}L`,
                item.retornoLitros != null && `Retorno ${item.retornoLitros}L`,
                item.coposSimples != null && `${item.coposSimples} copos${item.coposDuplos ? ` + ${item.coposDuplos} duplos` : ''}${item.coposCriancas ? ` + ${item.coposCriancas} crianças` : ''}`,
              ].filter(Boolean).join(' · ')}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => router.push('/session-form')}>
        <Text style={s.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { color: colors.text, fontWeight: '700', fontSize: 16 },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontWeight: '600', flex: 1 },
  date: { color: colors.green, fontSize: 13 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
