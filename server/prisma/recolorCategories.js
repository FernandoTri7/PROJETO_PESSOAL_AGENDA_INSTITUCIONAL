import { PrismaClient } from '@prisma/client';
import { CATEGORY_SEED } from './seedCategories.js';

// Aplica a paleta padrão (CATEGORY_SEED) às categorias JÁ existentes no banco.
// Diferente do seed (update vazio), este script SOBRESCREVE a cor das keys semeadas —
// use ao trocar a paleta padrão. Categorias criadas pelo usuário (keys fora do seed) não são tocadas.
// Rodar: `node prisma/recolorCategories.js`
const prisma = new PrismaClient();

async function main() {
  let n = 0;
  for (const c of CATEGORY_SEED) {
    const r = await prisma.category.updateMany({ where: { key: c.key }, data: { color: c.color } });
    n += r.count;
  }
  console.log(`Recoloridas ${n} categorias.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
