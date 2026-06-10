import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { calendarsRouter } from './routes/calendars.js';
import { eventsRouter } from './routes/events.js';
import { tasksRouter } from './routes/tasks.js';
import { birthdaysRouter } from './routes/birthdays.js';
import { sessionsRouter } from './routes/sessions.js';
import { vegetalRouter } from './routes/vegetal.js';
import { exportRouter } from './routes/export.js';
import { authMiddleware } from './lib/auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/calendars', authMiddleware, calendarsRouter);
app.use('/api/events', authMiddleware, eventsRouter);
app.use('/api/tasks', authMiddleware, tasksRouter);
app.use('/api/birthdays', authMiddleware, birthdaysRouter);
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/vegetal', authMiddleware, vegetalRouter);
app.use('/api/export', authMiddleware, exportRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
