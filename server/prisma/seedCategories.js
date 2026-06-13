import { PrismaClient } from '@prisma/client';

// Categorias canônicas — espelham app/src/theme.ts (NAV_CATS do web + enums nativos),
// agora com escopo por agenda. As keys são exatamente as gravadas em Event.category,
// então nenhum evento existente perde cor/label.
// Paleta suave e com hues distintos (legível com texto branco nos chips do calendário).
export const CATEGORY_SEED = [
  // Web (NAV_CATS)
  { key: 'sessao_escala',     label: 'Sessão de Escala',  color: '#2A8C8A', scope: 'INSTITUCIONAL' },
  { key: 'sessao_instrutiva', label: 'Sessão Instrutiva', color: '#3D7EA6', scope: 'INSTITUCIONAL' },
  { key: 'sessao_extra',      label: 'Sessão Extra',      color: '#6A8D4F', scope: 'INSTITUCIONAL' },
  { key: 'sessao_qm',         label: 'QM/CDC',            color: '#7E6BA6', scope: 'INSTITUCIONAL' },
  { key: 'sessao_jovens',     label: 'Sessão de Jovens',  color: '#3FA66F', scope: 'INSTITUCIONAL' },
  { key: 'sessao_anual',      label: 'Sessão Anual',      color: '#1F6E70', scope: 'INSTITUCIONAL' },
  { key: 'sessao_especial',   label: 'Sessão Especial',   color: '#C97B5A', scope: 'INSTITUCIONAL' },
  { key: 'reuniao',           label: 'Reunião',           color: '#5B6B7F', scope: 'INSTITUCIONAL' },
  { key: 'evento_especial',   label: 'Evento Especial',   color: '#D98E3D', scope: 'INSTITUCIONAL' },
  { key: 'bazar',             label: 'Bazar',             color: '#9B6BC2', scope: 'INSTITUCIONAL' },
  { key: 'mutirao',           label: 'Mutirão',           color: '#B57A45', scope: 'INSTITUCIONAL' },
  { key: 'encontro',          label: 'Encontro',          color: '#4F8FC0', scope: 'INSTITUCIONAL' },
  { key: 'feriado',           label: 'Feriado',           color: '#D9655B', scope: 'TODAS' },
  { key: 'aniversario',       label: 'Aniversário',       color: '#E89A3C', scope: 'TODAS' },
  { key: 'livre',             label: 'Livre',             color: '#7C8A99', scope: 'TODAS' },
  { key: 'outro',             label: 'Outro',             color: '#9AA0A6', scope: 'TODAS' },
  // Enums nativos (Event.category em maiúsculas — preserva eventos criados no app)
  { key: 'SESSAO',            label: 'Sessão',            color: '#2A8C8A', scope: 'INSTITUCIONAL' },
  { key: 'REUNIAO',           label: 'Reunião',           color: '#5B6B7F', scope: 'TODAS' },
  { key: 'TRABALHO',          label: 'Trabalho',          color: '#6A8D4F', scope: 'TODAS' },
  { key: 'FAMILIA',           label: 'Família',           color: '#3FA66F', scope: 'FAMILIAR' },
  { key: 'VIAGEM',            label: 'Viagem',            color: '#9B6BC2', scope: 'TODAS' },
  { key: 'ANIVERSARIO',       label: 'Aniversário',       color: '#E89A3C', scope: 'TODAS' },
  { key: 'OUTRO',             label: 'Outro',             color: '#7C8A99', scope: 'TODAS' },
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
