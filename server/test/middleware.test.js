import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/lib/rateLimit.js';
import { requireRole } from '../src/lib/auth.js';
import { validateBody } from '../src/lib/validate.js';
import { vegetalCreateSchema } from '../src/lib/schemas.js';

// Helpers para simular req/res do Express.
function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

test('rateLimit libera até o máximo e bloqueia com 429 depois', () => {
  const mw = rateLimit({ windowMs: 60000, max: 3 });
  const req = { ip: '1.1.1.1' };
  let allowed = 0;
  for (let i = 0; i < 3; i++) {
    const res = mockRes();
    mw(req, res, () => { allowed++; });
    assert.equal(res.statusCode, 200);
  }
  assert.equal(allowed, 3);
  const res = mockRes();
  mw(req, res, () => { throw new Error('não deveria passar'); });
  assert.equal(res.statusCode, 429);
});

test('rateLimit isola contagem por IP', () => {
  const mw = rateLimit({ windowMs: 60000, max: 1 });
  const resA = mockRes();
  mw({ ip: 'a' }, resA, () => {});
  assert.equal(resA.statusCode, 200);
  const resB = mockRes();
  mw({ ip: 'b' }, resB, () => {});
  assert.equal(resB.statusCode, 200); // IP diferente não é afetado
});

// Autorização agora é por vínculo de projeto (req.membership.role), não mais pela role global.
test('requireRole bloqueia papel não autorizado com 403', () => {
  const mw = requireRole('ADMIN', 'GESTOR');
  const res = mockRes();
  let passou = false;
  mw({ membership: { role: 'VISITANTE' } }, res, () => { passou = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(passou, false);
});

test('requireRole bloqueia 403 quando não há vínculo no projeto', () => {
  const mw = requireRole('ADMIN', 'GESTOR');
  const res = mockRes();
  let passou = false;
  mw({ membership: null }, res, () => { passou = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(passou, false);
});

test('requireRole permite papel autorizado', () => {
  const mw = requireRole('ADMIN', 'GESTOR');
  const res = mockRes();
  let passou = false;
  mw({ membership: { role: 'GESTOR' } }, res, () => { passou = true; });
  assert.equal(passou, true);
});

test('validateBody responde 400 com issues em payload inválido', () => {
  const mw = validateBody(vegetalCreateSchema);
  const req = { body: { nome: '', litros: 'abc' } };
  const res = mockRes();
  let passou = false;
  mw(req, res, () => { passou = true; });
  assert.equal(res.statusCode, 400);
  assert.equal(passou, false);
  assert.ok(Array.isArray(res.body.issues));
});

test('validateBody substitui req.body pelos dados validados e segue', () => {
  const mw = validateBody(vegetalCreateSchema);
  const req = { body: { nome: 'Lote', litros: '10', extra: 'descartar' } };
  const res = mockRes();
  let passou = false;
  mw(req, res, () => { passou = true; });
  assert.equal(passou, true);
  assert.equal('extra' in req.body, false);
});
