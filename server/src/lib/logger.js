// Logger estruturado (pino) — RF-06 da spec de segurança.
// Saída em JSON, correlacionável por requestId, com mascaramento de dados sensíveis.

import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Nunca registrar credenciais nem tokens nos logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passwordHash',
    ],
    censor: '[REDACTED]',
  },
});

// Middleware que emite um log estruturado por requisição, com req.id e tempo de resposta.
export const httpLogger = pinoHttp({
  logger,
  // 5xx como erro, 4xx como aviso, demais como info.
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
