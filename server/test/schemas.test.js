import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerSchema,
  eventCreateSchema,
  vegetalCreateSchema,
  sessionCreateSchema,
} from '../src/lib/schemas.js';

test('registerSchema rejeita e-mail inválido e senha curta', () => {
  assert.equal(registerSchema.safeParse({ name: 'A', email: 'x', password: '123' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'A', email: 'a@b.com', password: '12345' }).success, false);
});

test('registerSchema aceita payload válido', () => {
  assert.equal(registerSchema.safeParse({ name: 'A', email: 'a@b.com', password: '123456' }).success, true);
});

test('eventCreateSchema exige calendarId, title e start válido', () => {
  assert.equal(eventCreateSchema.safeParse({ calendarId: 'c1', title: 'X' }).success, false); // sem start
  assert.equal(eventCreateSchema.safeParse({ calendarId: 'c1', title: 'X', start: 'data-ruim' }).success, false);
  assert.equal(eventCreateSchema.safeParse({ calendarId: 'c1', title: 'X', start: '2026-06-15T19:00:00Z' }).success, true);
});

test('vegetalCreateSchema valida litros e enum de local', () => {
  assert.equal(vegetalCreateSchema.safeParse({ nome: 'L', litros: 'abc' }).success, false);
  assert.equal(vegetalCreateSchema.safeParse({ nome: 'L', litros: '12.5', local: 'INVALIDO' }).success, false);
  assert.equal(vegetalCreateSchema.safeParse({ nome: 'L', litros: '12.5', local: 'GELADEIRA' }).success, true);
});

test('sessionCreateSchema rejeita type fora da lista fechada', () => {
  assert.equal(sessionCreateSchema.safeParse({ calendarId: 'c1', date: '2026-06-15', type: 'NAO_EXISTE' }).success, false);
  assert.equal(sessionCreateSchema.safeParse({ calendarId: 'c1', date: '2026-06-15', type: 'ESCALA' }).success, true);
});

test('schema descarta chaves desconhecidas', () => {
  const parsed = registerSchema.parse({ name: 'A', email: 'a@b.com', password: '123456', hacker: true });
  assert.equal('hacker' in parsed, false);
});
