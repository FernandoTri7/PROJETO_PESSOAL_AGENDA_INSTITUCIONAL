// Rate limiter simples em memória (janela deslizante por IP).
// Equivalente leve a express-rate-limit para processo único (RF-02 da spec de segurança).
// Para múltiplas instâncias, trocar o store por Redis sem mudar a interface.

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Limpeza periódica para não crescer indefinidamente.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of hits) if (rec.resetAt <= now) hits.delete(ip);
  }, windowMs);
  if (timer.unref) timer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let rec = hits.get(ip);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message || 'Muitas tentativas. Tente novamente em instantes.' });
    }
    next();
  };
}
