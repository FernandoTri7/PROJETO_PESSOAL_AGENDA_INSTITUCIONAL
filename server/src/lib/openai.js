// Transcrição de áudio via OpenAI (Whisper). Usa fetch/FormData/Blob nativos (Node 18+).
// Configuração: OPENAI_API_KEY (obrigatória) e OPENAI_TRANSCRIBE_MODEL (opcional; padrão whisper-1).

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

export function transcriptionConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

// Recebe o áudio (Buffer) e devolve { configured, text } ou lança Error com mensagem clara.
export async function transcribeAudio(buffer, filename = 'audio.webm', mimeType = 'audio/webm') {
  if (!transcriptionConfigured()) return { configured: false, text: '' };
  const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), filename);
  form.append('model', model);
  form.append('language', 'pt');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Falha na transcrição (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return { configured: true, text: (data.text || '').trim() };
}
