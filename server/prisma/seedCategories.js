import { PrismaClient } from '@prisma/client';

// Categorias canônicas — espelham app/src/theme.ts (NAV_CATS do web + enums nativos),
// agora com escopo por agenda. As keys são exatamente as gravadas em Event.category,
// então nenhum evento existente perde cor/label.
export const CATEGORY_SEED = [
  // Web (NAV_CATS)
  { key: 'sessao_escala',     label: 'Sessão de Escala',  color: '#0F5C5E', scope: 'INSTITUCIONAL' },
  { key: 'sessao_instrutiva', label: 'Sessão Instrutiva', color: '#0A6A6C', scope: 'INSTITUCIONAL' },
  { key: 'sessao_extra',      label: 'Sessão Extra',      color: '#13807F', scope: 'INSTITUCIONAL' },
  { key: 'sessao_qm',         label: 'QM/CDC',            color: '#0D4D4F', scope: 'INSTITUCIONAL' },
  { key: 'sessao_jovens',     label: 'Sessão de Jovens',  color: '#22C55E', scope: 'INSTITUCIONAL' },
  { key: 'sessao_anual',      label: 'Sessão Anual',      color: '#073C3E', scope: 'INSTITUCIONAL' },
  { key: 'sessao_especial',   label: 'Sessão Especial',   color: '#15706F', scope: 'INSTITUCIONAL' },
  { key: 'reuniao',           label: 'Reunião',           color: '#1F2933', scope: 'INSTITUCIONAL' },
  { key: 'evento_especial',   label: 'Evento Especial',   color: '#D67708', scope: 'INSTITUCIONAL' },
  { key: 'bazar',             label: 'Bazar',             color: '#7C3AED', scope: 'INSTITUCIONAL' },
  { key: 'mutirao',           label: 'Mutirão',           color: '#B45309', scope: 'INSTITUCIONAL' },
  { key: 'encontro',          label: 'Encontro',          color: '#0369A1', scope: 'INSTITUCIONAL' },
  { key: 'feriado',           label: 'Feriado',           color: '#EF4444', scope: 'TODAS' },
  { key: 'aniversario',       label: 'Aniversário',       color: '#F5A018', scope: 'TODAS' },
  { key: 'livre',             label: 'Livre',             color: '#52606D', scope: 'TODAS' },
  { key: 'outro',             label: 'Outro',             color: '#9AA0A6', scope: 'TODAS' },
  // Enums nativos (Event.category em maiúsculas — preserva eventos criados no app)
  { key: 'SESSAO',            label: 'Sessão',            color: '#0F5C5E', scope: 'INSTITUCIONAL' },
  { key: 'REUNIAO',           label: 'Reunião',           color: '#1F2933', scope: 'TODAS' },
  { key: 'TRABALHO',          label: 'Trabalho',          color: '#0A6A6C', scope: 'TODAS' },
  { key: 'FAMILIA',           label: 'Família',           color: '#22C55E', scope: 'FAMILIAR' },
  { key: 'VIAGEM',            label: 'Viagem',            color: '#7C3AED', scope: 'TODAS' },
  { key: 'ANIVERSARIO',       label: 'Aniversário',       color: '#F5A018', scope: 'TODAS' },
  { key: 'OUTRO',             label: 'Outro',             color: '#52606D', scope: 'TODAS' },
];

// Idempotente: cria as faltantes e NÃO sobrescreve edições do usuário (update vazio).
export async function seedCategories(prisma) {
  for (let i = 0; i < CATEGORY_SEED.length; i++) {
    const c = CATEGORY_SEED[i];
    await prisma.category.upsert({
      where: { key: c.key },
      update: {},
      create: { key: c.key, label: c.label, color: c.color, scope: c.scope, order: i },
    });
  }
}

// Permite rodar isolado para backfill em DB já populado: `node prisma/seedCategories.js`
if (process.argv[1] && process.argv[1].endsWith('seedCategories.js')) {
  const prisma = new PrismaClient();
  seedCategories(prisma)
    .then(() => console.log(`Categorias seedadas: ${CATEGORY_SEED.length}`))
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
