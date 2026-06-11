// Notificações no web: usa a Web Notifications API enquanto a aba está aberta.
// Agenda via setTimeout a partir do campo `reminders` (minutos antes) de cada evento.

let timers: any[] = [];

function parseReminders(reminders?: string): number[] {
  return String(reminders || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { return (await Notification.requestPermission()) === 'granted'; }
  catch { return false; }
}

export function clearScheduledNotifications() {
  timers.forEach(clearTimeout);
  timers = [];
}

// Reagenda as notificações dos eventos. Só dispara enquanto a aba estiver aberta.
export async function scheduleEventNotifications(events: any[], enabled: boolean) {
  clearScheduledNotifications();
  if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const now = Date.now();
  const HORIZON = 24 * 3600 * 1000; // agenda apenas o que cai nas próximas 24h
  for (const ev of events) {
    const start = new Date(ev.start).getTime();
    for (const m of parseReminders(ev.reminders)) {
      const delay = start - m * 60000 - now;
      if (delay > 0 && delay < HORIZON) {
        timers.push(setTimeout(() => {
          try {
            const quando = m >= 60 ? `${Math.round(m / 60)}h` : `${m}min`;
            new Notification(ev.title, { body: `Começa em ${quando}${ev.location ? ` · ${ev.location}` : ''}` });
          } catch { /* ignora */ }
        }, delay));
      }
    }
  }
}
