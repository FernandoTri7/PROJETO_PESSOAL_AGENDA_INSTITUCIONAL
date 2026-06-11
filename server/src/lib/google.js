// Integração com o Google (OAuth2): gerar link do Meet (Calendar API) e anexar do Drive (Picker).
// Sem GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI configurados, googleConfigured = false e os
// endpoints respondem com orientação em vez de quebrar.
import { google } from 'googleapis';
import { prisma } from './prisma.js';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
export const googleConfigured = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events', // criar evento p/ gerar Meet
  'https://www.googleapis.com/auth/drive.file',       // anexos escolhidos via Picker
];

export function oauthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

// state carrega um JWT do usuário para correlacionar o callback (que chega sem header de auth).
export function getAuthUrl(state) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // garante refresh_token
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeAndSave(userId, code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email = null;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    email = (await oauth2.userinfo.get()).data.email || null;
  } catch { /* opcional */ }

  const data = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope,
    email,
  };
  await prisma.googleAccount.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data, refreshToken: tokens.refresh_token ?? null },
  });
  return { email };
}

// OAuth2 client autenticado para o usuário; persiste o access token quando refrescado.
export async function clientForUser(userId) {
  const acc = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!acc) return null;
  const client = oauthClient();
  client.setCredentials({
    access_token: acc.accessToken,
    refresh_token: acc.refreshToken || undefined,
    expiry_date: acc.expiry ? acc.expiry.getTime() : undefined,
  });
  client.on('tokens', (t) => {
    prisma.googleAccount.update({
      where: { userId },
      data: {
        accessToken: t.access_token || acc.accessToken,
        refreshToken: t.refresh_token || acc.refreshToken,
        expiry: t.expiry_date ? new Date(t.expiry_date) : acc.expiry,
      },
    }).catch(() => {});
  });
  return client;
}

// Access token válido (refresca se necessário) — usado pelo Google Picker no frontend.
export async function freshAccessToken(userId) {
  const client = await clientForUser(userId);
  if (!client) return null;
  const { token } = await client.getAccessToken();
  return token || null;
}
