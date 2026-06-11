import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandRecurrences } from '../src/lib/recurrence.js';

const baseEvent = {
  id: 'e1',
  title: 'Sessão semanal',
  start: new Date('2026-01-03T19:00:00.000Z'), // sábado
  end: new Date('2026-01-03T21:00:00.000Z'),
};

test('evento sem rrule é retornado quando dentro do período', () => {
  const out = expandRecurrences([baseEvent], new Date('2026-01-01'), new Date('2026-01-31'));
  assert.equal(out.length, 1);
  assert.equal(out[0].occurrence, undefined);
});

test('evento sem rrule é omitido quando fora do período', () => {
  const out = expandRecurrences([baseEvent], new Date('2026-02-01'), new Date('2026-02-28'));
  assert.equal(out.length, 0);
});

test('FREQ=WEEKLY expande uma ocorrência por semana no período', () => {
  const ev = { ...baseEvent, rrule: 'FREQ=WEEKLY' };
  // fim do dia para incluir a ocorrência das 19:00 de 31/01
  const out = expandRecurrences([ev], new Date('2026-01-01'), new Date('2026-01-31T23:59:59.000Z'));
  // 03, 10, 17, 24, 31 de janeiro = 5 sábados
  assert.equal(out.length, 5);
  assert.ok(out.every((o) => o.occurrence === true));
});

test('COUNT limita o número de ocorrências', () => {
  const ev = { ...baseEvent, rrule: 'FREQ=WEEKLY;COUNT=3' };
  const out = expandRecurrences([ev], new Date('2026-01-01'), new Date('2026-12-31'));
  assert.equal(out.length, 3);
});

test('UNTIL encerra a série na data limite', () => {
  const ev = { ...baseEvent, rrule: 'FREQ=WEEKLY;UNTIL=20260117' };
  const out = expandRecurrences([ev], new Date('2026-01-01'), new Date('2026-12-31'));
  // 03, 10, 17 de janeiro
  assert.equal(out.length, 3);
});

test('duração da ocorrência preserva o intervalo do evento original', () => {
  const ev = { ...baseEvent, rrule: 'FREQ=DAILY;COUNT=1' };
  const [oc] = expandRecurrences([ev], new Date('2026-01-01'), new Date('2026-01-31'));
  const dur = new Date(oc.end) - new Date(oc.start);
  assert.equal(dur, 2 * 60 * 60 * 1000); // 2 horas
});

test('série infinita é limitada (não estoura) e respeita o fim do período', () => {
  const ev = { ...baseEvent, rrule: 'FREQ=DAILY' };
  const out = expandRecurrences([ev], new Date('2026-01-03'), new Date('2026-01-12T23:59:59.000Z'));
  assert.equal(out.length, 10); // 03..12 inclusive
});
