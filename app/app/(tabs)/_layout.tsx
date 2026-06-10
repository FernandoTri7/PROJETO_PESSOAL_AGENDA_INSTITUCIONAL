import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { loadToken } from '../../src/api';
import { colors } from '../../src/theme';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadToken().then((t) => {
      if (!t) router.replace('/login');
      else setReady(true);
    });
  }, []);
  if (!ready) return null;

  return (
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
      <Tabs.Screen name="index" options={{ title: 'Agenda', tabBarIcon: (p) => <Icon emoji="📅" {...p} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tarefas', tabBarIcon: (p) => <Icon emoji="✅" {...p} /> }} />
      <Tabs.Screen name="birthdays" options={{ title: 'Aniversários', tabBarIcon: (p) => <Icon emoji="🎂" {...p} /> }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessões', tabBarIcon: (p) => <Icon emoji="🌿" {...p} /> }} />
      <Tabs.Screen name="more" options={{ title: 'Mais', tabBarIcon: (p) => <Icon emoji="⚙️" {...p} /> }} />
    </Tabs>
  );
}
