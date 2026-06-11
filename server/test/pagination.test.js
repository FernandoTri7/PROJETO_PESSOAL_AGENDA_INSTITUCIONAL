import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination } from '../src/lib/pagination.js';

test('sem parâmetros, paginated=false (comportamento completo preservado)', () => {
  const pg = parsePagination({});
  assert.equal(pg.paginated, false);
});

test('page/pageSize calculam skip e take', () => {
  const pg = parsePagination({ page: '3', pageSize: '20' });
  assert.equal(pg.paginated, true);
  assert.equal(pg.take, 20);
  assert.equal(pg.skip, 40); // (3-1)*20
  assert.equal(pg.page, 3);
});

test('limit funciona como pageSize', () => {
  const pg = parsePagination({ limit: '10' });
  assert.equal(pg.paginated, true);
  assert.equal(pg.take, 10);
  assert.equal(pg.skip, 0);
});

test('offset define skip e deriva a página', () => {
  const pg = parsePagination({ offset: '50', pageSize: '25' });
  assert.equal(pg.skip, 50);
  assert.equal(pg.page, 3); // floor(50/25)+1
});

test('pageSize é limitado ao máximo', () => {
  const pg = parsePagination({ pageSize: '9999' }, { maxSize: 200 });
  assert.equal(pg.take, 200);
});

test('valores inválidos caem no padrão', () => {
  const pg = parsePagination({ page: 'abc', pageSize: '-5' }, { defaultSize: 50 });
  assert.equal(pg.page, 1);
  assert.equal(pg.take, 50);
});
