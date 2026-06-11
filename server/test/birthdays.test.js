import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/routes/birthdays.js';

const ref = new Date('2026-06-10T12:00:00.000Z');

test('0 a 11 anos classifica como CRIANCA', () => {
  assert.equal(classify('2020-01-01', ref).group, 'CRIANCA'); // 6 anos
  assert.equal(classify('2015-06-09', ref).group, 'CRIANCA'); // 11 anos (já fez aniversário)
});

test('borda dos 12 anos vira JOVEM', () => {
  assert.equal(classify('2014-06-10', ref).group, 'JOVEM'); // faz 12 hoje
});

test('12 a 17 anos classifica como JOVEM', () => {
  assert.equal(classify('2010-01-01', ref).group, 'JOVEM'); // 16
  assert.equal(classify('2009-06-09', ref).group, 'JOVEM'); // 17
});

test('borda dos 18 anos vira ADULTO', () => {
  assert.equal(classify('2008-06-10', ref).group, 'ADULTO'); // faz 18 hoje
});

test('aniversário ainda não ocorrido no ano reduz a idade', () => {
  // nasceu em dezembro: em junho ainda não fez aniversário
  assert.equal(classify('2014-12-31', ref).age, 11);
  assert.equal(classify('2014-12-31', ref).group, 'CRIANCA');
});
