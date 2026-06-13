import { api } from './api';

// Preferências do usuário (espelham server: User.prefs JSON).
// hiddenCalendarIds: agendas que o usuário escolheu ocultar da visualização.
// useInstitutional: legado (mantido por compatibilidade; hiddenCalendarIds é a fonte atual).
export type Prefs = {
  notificationsEnabled: boolean;
  useInstitutional: boolean;
  hiddenCalendarIds: string[];
};

export type Me = { id: string; name: string; email: string; role: string; phone?: string | null };

const DEFAULT: Prefs = { notificationsEnabled: false, useInstitutional: true, hiddenCalendarIds: [] };

let cache: Prefs = { ...DEFAULT };
let me: Me | null = null;
let loaded = false;

export function getPrefs(): Prefs { return cache; }
export function getMe(): Me | null { return me; }
export function isAdmin(): boolean { return me?.role === 'ADMIN'; }
export function prefsLoaded(): boolean { return loaded; }

export async function loadPrefs(): Promise<Prefs> {
  try {
    const res = await api('/auth/me');
    cache = { ...DEFAULT, ...(res?.prefs || {}) };
    me = { id: res.id, name: res.name, email: res.email, role: res.role, phone: res.phone ?? null };
    loaded = true;
  } catch { /* mantém o cache atual */ }
  return cache;
}

export async function savePrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const res = await api('/auth/me/prefs', { method: 'PUT', body: patch });
  cache = { ...DEFAULT, ...(res?.prefs || {}) };
  loaded = true;
  return cache;
}
