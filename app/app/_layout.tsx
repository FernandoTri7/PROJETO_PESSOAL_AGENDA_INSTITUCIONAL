import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="event-form" options={{ title: 'Evento', presentation: 'modal' }} />
        <Stack.Screen name="session-form" options={{ title: 'Sessão', presentation: 'modal' }} />
        <Stack.Screen name="birthday-form" options={{ title: 'Aniversário', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
