// Paginação opt-in para endpoints de listagem (item 8 da avaliação arquitetural).
// Sem parâmetros de paginação, o comportamento é o atual (retorna a lista completa).
// Com page/pageSize (ou limit/offset), aplica recorte e expõe headers X-Total-Count/X-Page/X-Page-Size.

export function parsePagination(query = {}, { defaultSize = 50, maxSize = 200 } = {}) {
  const present = (k) => query[k] !== undefined && query[k] !== '';
  const paginated = ['page', 'pageSize', 'limit', 'offset'].some(present);

  let pageSize = parseInt(query.pageSize ?? query.limit ?? defaultSize, 10);
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = defaultSize;
  pageSize = Math.min(pageSize, maxSize);

  let page;
  let skip;
  if (present('offset')) {
    let off = parseInt(query.offset, 10);
    if (!Number.isInteger(off) || off < 0) off = 0;
    skip = off;
    page = Math.floor(off / pageSize) + 1;
  } else {
    page = parseInt(query.page ?? 1, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    skip = (page - 1) * pageSize;
  }

  return { paginated, page, pageSize, skip, take: pageSize };
}

// Define os headers de paginação na resposta (total sempre; página/tamanho só quando paginado).
export function setPaginationHeaders(res, { total, page, pageSize, paginated }) {
  res.set('X-Total-Count', String(total));
  if (paginated) {
    res.set('X-Page', String(page));
    res.set('X-Page-Size', String(pageSize));
  }
}
