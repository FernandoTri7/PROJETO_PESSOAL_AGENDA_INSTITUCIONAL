// Notificações no mobile via expo-notifications (Expo SDK 56).
// Doc: https://docs.expo.dev/versions/v56.0.0/sdk/notifications/
import * as Notifications from 'expo-notifications';

// Como exibir a notificação com o app em primeiro plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function parseReminders(reminders?: string): number[] {
  return String(reminders || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return result.granted;
}

export function clearScheduledNotifications() {
  // Disparado e aguardado por quem reagenda; aqui só inicia o cancelamento.
  Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

// Cancela o agendamento anterior e reprograma a partir do campo `reminders`.
export async function scheduleEventNotifications(events: any[], enabled: boolean) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const now = Date.now();
    for (const ev of events) {
      const start = new Date(ev.start).getTime();
      for (const m of parseReminders(ev.reminders)) {
        const at = start - m * 60000;
        if (at <= now) continue;
        const quando = m >= 60 ? `${Math.round(m / 60)}h` : `${m}min`;
        await Notifications.scheduleNotificationAsync({
          content: { title: ev.title, body: `Começa em ${quando}${ev.location ? ` · ${ev.location}` : ''}` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
        });
      }
    }
  } catch { /* ignora falhas de agendamento */ }
}
