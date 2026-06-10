import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// No celular (Expo Go), troque por http://SEU_IP_LOCAL:4000
export const API_URL = Platform.OS === 'web' ? 'http://localhost:4000' : 'http://192.168.0.1:4000';

let token: string | null = null;

export async function loadToken() {
  token = await AsyncStorage.getItem('token');
  return token;
}

export async function setToken(t: string | null) {
  token = t;
  if (t) await AsyncStorage.setItem('token', t);
  else await AsyncStorage.removeItem('token');
}

export async function clearToken() {
  token = null;
  await AsyncStorage.removeItem('token');
}

export async function api(path: string, options: { method?: string; body?: any } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}
