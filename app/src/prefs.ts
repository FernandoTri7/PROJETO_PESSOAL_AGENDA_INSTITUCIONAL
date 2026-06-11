import { api } from './api';

// Preferências do usuário (espelham server: User.prefs JSON).
export type Prefs = { notificationsEnabled: boolean; useInstitutional: boolean };

const DEFAULT: Prefs = { notificationsEnabled: false, useInstitutional: true };

let cache: Prefs = { ...DEFAULT };
let loaded = false;

export function getPrefs(): Prefs { return cache; }
export function prefsLoaded(): boolean { return loaded; }

export async function loadPrefs(): Promise<Prefs> {
  try {
    const me = await api('/auth/me');
    cache = { ...DEFAULT, ...(me?.prefs || {}) };
    loaded = true;
  } catch { /* mantém o cache atual */ }
  return cache;
}

export async function savePrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const me = await api('/auth/me/prefs', { method: 'PUT', body: patch });
  cache = { ...DEFAULT, ...(me?.prefs || {}) };
  loaded = true;
  return cache;
}
