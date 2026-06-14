import { Router } from 'express';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { transcribeAudio, transcriptionConfigured } from '../lib/openai.js';

export const audioRouter = Router();

// Diretório de upload de áudio (servido estaticamente em /uploads).
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Extensão a partir do mime (Whisper aceita webm/mp3/m4a/wav/...).
function extFor(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('ogg')) return 'ogg';
  return 'webm';
}

// Resolve o arquivo de áudio de uma URL pública (/uploads/audio/<nome>) com proteção contra traversal.
function resolveAudioPath(url) {
  const prefix = '/uploads/audio/';
  if (!url || !url.startsWith(prefix)) return null;
  const name = path.basename(url.slice(prefix.length)); // basename evita ../
  const full = path.join(AUDIO_DIR, name);
  if (!full.startsWith(AUDIO_DIR)) return null;
  return full;
}

// POST /api/audio/upload — corpo = áudio cru (Content-Type audio/*). Salva e devolve um anexo.
audioRouter.post(
  '/upload',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }),
  (req, res) => {
    const buf = req.body;
    if (!buf || !buf.length) return res.status(400).json({ error: 'Áudio vazio.' });
    const mime = req.headers['content-type'] || 'audio/webm';
    const ext = extFor(mime);
    const file = `${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(AUDIO_DIR, file), buf);
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    res.json({ name: `Áudio ${stamp}`, url: `/uploads/audio/${file}`, mimeType: mime, provider: 'audio' });
  }
);

// POST /api/audio/transcribe — { url } de um áudio já enviado → texto transcrito.
audioRouter.post('/transcribe', express.json(), async (req, res) => {
  if (!transcriptionConfigured()) {
    return res.json({ configured: false, text: '', message: 'Defina OPENAI_API_KEY no servidor (.env) para transcrever.' });
  }
  const full = resolveAudioPath(req.body?.url);
  if (!full || !fs.existsSync(full)) return res.status(400).json({ error: 'Áudio não encontrado.' });
  const buf = fs.readFileSync(full);
  const result = await transcribeAudio(buf, path.basename(full), 'audio/' + extFor(path.extname(full)));
  res.json(result);
});
