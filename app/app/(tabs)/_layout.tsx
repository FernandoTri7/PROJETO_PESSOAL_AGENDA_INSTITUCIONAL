import { useEffect, useState } from 'react';
import { ColorValue, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { loadToken } from '../../src/api';
import { loadPrefs } from '../../src/prefs';
import { colors } from '../../src/theme';
import { SpeedDial } from '../../src/SpeedDial';

type IoniconName = keyof typeof Ionicons.glyphMap;
const tabIcon = (name: IoniconName) => ({ color, size }: { color: ColorValue; size: number }) =>
  <Ionicons name={name} size={size} color={color as string} />;

export default function TabsLayout() {
  const [ready, setReady] = useState(false);
  const [useInstitutional, setUseInstitutional] = useState(true);
  useEffect(() => {
    loadToken().then((t) => {
      if (!t) router.replace('/login');
      else { setReady(true); loadPrefs().then((p) => setUseInstitutional(p.useInstitutional)); }
    });
  }, []);
  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Agenda', tabBarIcon: tabIcon('calendar') }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tarefas', tabBarIcon: tabIcon('checkbox') }} />
        <Tabs.Screen name="birthdays" options={{ title: 'Aniversários', tabBarIcon: tabIcon('gift') }} />
        <Tabs.Screen name="sessions" options={{ title: 'Sessões', tabBarIcon: tabIcon('leaf'), href: useInstitutional ? undefined : null } as any} />
        <Tabs.Screen name="more" options={{ title: 'Mais', tabBarIcon: tabIcon('ellipsis-horizontal') }} />
      </Tabs>
      <SpeedDial />
    </View>
  );
}
