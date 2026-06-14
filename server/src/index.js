import 'dotenv/config'; // carrega variáveis de server/.env ANTES dos demais módulos lerem process.env
import express from 'express';
import 'express-async-errors'; // encaminha erros de handlers async ao error handler global (evita crash do processo)
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { calendarsRouter } from './routes/calendars.js';
import { eventsRouter } from './routes/events.js';
import { categoriesRouter } from './routes/categories.js';
import { rsvpRouter } from './routes/rsvp.js';
import { googleRouter } from './routes/google.js';
import { tasksRouter } from './routes/tasks.js';
import { taskGroupsRouter } from './routes/taskGroups.js';
import { audioRouter, UPLOADS_DIR } from './routes/audio.js';
import { birthdaysRouter } from './routes/birthdays.js';
import { sessionsRouter } from './routes/sessions.js';
import { vegetalRouter } from './routes/vegetal.js';
import { exportRouter } from './routes/export.js';
import { authMiddleware } from './lib/auth.js';
import { logger, httpLogger } from './lib/logger.js';

const app = express();

// Confia no proxy reverso (Railway/Render/Nginx) para obter o IP real no rate limit.
app.set('trust proxy', 1);

// CORS por allowlist: defina CORS_ORIGINS como lista separada por vírgula em produção.
// Sem a variável (desenvolvimento), libera qualquer origem para facilitar o fluxo local.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem origin (curl, apps nativos, server-to-server) são permitidas.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origem não permitida pelo CORS'));
    },
    // Permite que o cliente leia os headers de paginação via fetch.
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
  })
);

app.use(express.json({ limit: '5mb' }));

// Log estruturado por requisição (req.id, status, tempo de resposta).
app.use(httpLogger);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Arquivos enviados (áudio das tarefas) — servidos publicamente; nomes são UUID não-adivinháveis.
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRouter);
// Rota pública: resposta de convite (RSVP) via link do e-mail, sem login.
app.use('/api/rsvp', rsvpRouter);
// Google OAuth: o /callback é público (navegação do browser); as demais usam authMiddleware por rota.
app.use('/api/google', googleRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/calendars', authMiddleware, calendarsRouter);
app.use('/api/events', authMiddleware, eventsRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/tasks', authMiddleware, tasksRouter);
app.use('/api/task-groups', authMiddleware, taskGroupsRouter);
app.use('/api/audio', authMiddleware, audioRouter);
app.use('/api/birthdays', authMiddleware, birthdaysRouter);
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/vegetal', authMiddleware, vegetalRouter);
app.use('/api/export', authMiddleware, exportRouter);

app.use((err, req, res, _next) => {
  if (err?.message === 'Origem não permitida pelo CORS') {
    return res.status(403).json({ error: err.message });
  }
  // Erros de domínio (regras da identidade central) carregam o status HTTP adequado.
  if (err?.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  // Usa o logger da requisição (com req.id) quando disponível.
  (req.log || logger).error({ err }, 'erro não tratado na requisição');
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`API rodando em http://localhost:${PORT}`));
