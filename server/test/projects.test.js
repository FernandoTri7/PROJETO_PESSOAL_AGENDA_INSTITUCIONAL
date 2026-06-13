import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roleRank,
  assertNotTouchingOwner,
  assertValidRole,
  assertNotAssigningGestor,
  DomainError,
} from '../src/lib/projects.js';

test('roleRank ordena os papéis do projeto', () => {
  assert.ok(roleRank('GESTOR') > roleRank('ADMIN'));
  assert.ok(roleRank('ADMIN') > roleRank('MEMBRO'));
  assert.ok(roleRank('MEMBRO') > roleRank('VISITANTE'));
  assert.equal(roleRank('INEXISTENTE'), -1);
});

test('assertNotTouchingOwner bloqueia mexer no gestor atual', () => {
  const project = { ownerUserId: 'u1' };
  assert.throws(() => assertNotTouchingOwner(project, 'u1', 'rebaixado'), (e) => e instanceof DomainError && e.status === 409);
});

test('assertNotTouchingOwner permite mexer em não-gestor', () => {
  const project = { ownerUserId: 'u1' };
  assert.doesNotThrow(() => assertNotTouchingOwner(project, 'u2', 'rebaixado'));
});

test('assertNotTouchingOwner não quebra quando o projeto ainda não tem owner', () => {
  assert.doesNotThrow(() => assertNotTouchingOwner({ ownerUserId: null }, 'u2', 'desativado'));
});

test('assertValidRole rejeita papel desconhecido (422)', () => {
  assert.throws(() => assertValidRole('CHEFE'), (e) => e instanceof DomainError && e.status === 422);
  assert.doesNotThrow(() => assertValidRole('ADMIN'));
});

test('assertNotAssigningGestor impede atribuir GESTOR fora da transferência (409)', () => {
  assert.throws(() => assertNotAssigningGestor('GESTOR'), (e) => e instanceof DomainError && e.status === 409);
  assert.doesNotThrow(() => assertNotAssigningGestor('ADMIN'));
});
