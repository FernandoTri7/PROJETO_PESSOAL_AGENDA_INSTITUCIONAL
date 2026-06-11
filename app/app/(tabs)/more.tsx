import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Linking, Switch, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, setToken, API_URL } from '../../src/api';
import { loadPrefs, savePrefs, getPrefs } from '../../src/prefs';
import { requestNotificationPermission } from '../../src/notifications';
import { colors } from '../../src/theme';

const SCOPE_LABEL: Record<string, string> = {
  PESSOAL: 'Pessoal', FAMILIAR: 'Familiar', INSTITUCIONAL: 'Institucional', TODAS: 'Todas',
};

export default function More() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [vegetal, setVegetal] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [prefs, setPrefs] = useState(getPrefs());

  const load = useCallback(async () => {
    try {
      setCalendars(await api('/calendars'));
      setVegetal(await api('/vegetal'));
      setCats(await api('/categories'));
      setPrefs(await loadPrefs());
    } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleNotifications(on: boolean) {
    if (on) { const ok = await requestNotificationPermission(); if (!ok) { Alert.alert('Permissão negada', 'Ative as notificações nas configurações do sistema.'); return; } }
    setPrefs(await savePrefs({ notificationsEnabled: on }));
  }
  async function toggleInstitutional(on: boolean) {
    setPrefs(await savePrefs({ useInstitutional: on }));
    Alert.alert('Preferência salva', 'A aba Sessões será atualizada ao reabrir o app.');
  }

  async function logout() {
    await setToken(null);
    router.replace('/login');
  }

  return (
    <View style={s.container}>
      <Text style={s.section}>Preferências</Text>
      <View style={s.card}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Notificações de eventos</Text>
          <Text style={s.meta}>Avisa antes dos eventos, com base nos lembretes.</Text>
        </View>
        <Switch value={prefs.notificationsEnabled} onValueChange={toggleNotifications} />
      </View>
      <View style={s.card}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Usar agenda institucional</Text>
          <Text style={s.meta}>Desligado: oculta Sessões e eventos institucionais.</Text>
        </View>
        <Switch value={prefs.useInstitutional} onValueChange={toggleInstitutional} />
      </View>

      <Text style={s.section}>Minhas agendas</Text>
      <FlatList
        data={calendars}
        keyExtractor={(c) => c.id}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={[s.colorDot, { backgroundColor: item.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.name}</Text>
              <Text style={s.meta}>{item.type} · {item.members?.length || 0} membro(s)</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/api/export/ics/${item.id}`)}>
              <Text style={s.link}>Exportar ICS</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.section}>Categorias de evento</Text>
        <TouchableOpacity onPress={() => router.push('/category-form')}><Text style={s.link}>+ Nova</Text></TouchableOpacity>
      </View>
      <FlatList
        data={cats}
        keyExtractor={(c: any) => c.id}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/category-form', params: { id: item.id } })}>
            <View style={[s.colorDot, { backgroundColor: item.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.label}</Text>
              <Text style={s.meta}>{SCOPE_LABEL[item.scope] || item.scope}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {vegetal && (
        <>
          <Text style={s.section}>Estoque de Vegetal — total {vegetal.total?.toFixed(1)} L</Text>
          <FlatList
            data={vegetal.lotes}
            keyExtractor={(l: any) => l.id}
            style={{ flexGrow: 0 }}
            renderItem={({ item }) => (
              <View style={s.card}>
                <Text style={{ fontSize: 18 }}>🌿</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{item.nome}</Text>
                  <Text style={s.meta}>{item.litros} L · {item.local === 'GELADEIRA' ? 'Geladeira' : 'Fora da geladeira'}{item.origem ? ` · ${item.origem}` : ''}</Text>
                </View>
              </View>
            )}
          />
        </>
      )}
      <TouchableOpacity style={s.logout} onPress={logout}>
        <Text style={s.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  section: { color: colors.muted, fontSize: 13, textTransform: 'uppercase', marginVertical: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  title: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  link: { color: colors.primary, fontSize: 13 },
  logout: { marginTop: 'auto', borderColor: colors.red, borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  logoutText: { color: colors.red, fontWeight: '600' },
});
