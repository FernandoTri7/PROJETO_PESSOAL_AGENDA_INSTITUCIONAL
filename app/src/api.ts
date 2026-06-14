import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Porta 4100 (a 4000 é usada por outro projeto local).
// No celular (Expo Go), troque por http://SEU_IP_LOCAL:4100
export const API_URL = Platform.OS === 'web' ? 'http://localhost:4100' : 'http://192.168.0.1:4100';

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
  if (!res.ok) {
    // Quando a API devolve issues de validação (zod), inclui os campos no texto do erro
    // para que a mensagem seja acionável em vez de só "Dados inválidos".
    let msg = data.error || `Erro ${res.status}`;
    if (Array.isArray(data.issues) && data.issues.length) {
      const detail = data.issues
        .map((i: any) => (i.field && i.field !== '(body)' ? `${i.field}: ${i.message}` : i.message))
        .join('; ');
      msg = `${msg} — ${detail}`;
    }
    throw new Error(msg);
  }
  return data;
}

// Envia um Blob cru (ex.: áudio gravado) com o Content-Type do próprio blob. Retorna o JSON da resposta.
export async function apiUpload(path: string, blob: Blob) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}
