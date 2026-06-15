// Seed idempotente dos Tipos de Sessão padrão (espelha os tipos antes fixos no app).
// Reexecutável: não duplica (match por key). Não sobrescreve o que o usuário editou.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TIPOS = [
  { key: 'ESCALA', label: 'Escala', cor: '#0F5C2E', ordem: 1 },
  { key: 'ESCALA_ANUAL', label: 'Escala Anual', cor: '#0d4d2e', ordem: 2 },
  { key: 'INSTRUTIVA', label: 'Instrutiva', cor: '#0a6640', ordem: 3 },
  { key: 'EXTRA', label: 'Extra', cor: '#1a7a4a', ordem: 4 },
  { key: 'ADVENTICIOS', label: 'Adventícios', cor: '#2d5016', ordem: 5 },
  { key: 'DIRECAO', label: 'Direção', cor: '#0F2A4A', ordem: 6 },
  { key: 'QUADRO_DE_MESTRES', label: 'Quadro de Mestres', cor: '#1a3a5c', ordem: 7 },
  { key: 'COMEMORATIVA', label: 'Comemorativa', cor: '#C9952A', ordem: 8 },
  { key: 'OUTRA', label: 'Outra', cor: '#6b7280', ordem: 9 },
];

async function main() {
  let criados = 0;
  for (const t of TIPOS) {
    const existing = await prisma.tipoSessao.findUnique({ where: { key: t.key } });
    if (existing) continue;
    await prisma.tipoSessao.create({ data: t });
    criados++;
  }
  console.log(`Tipos de sessão: ${criados} criados, ${TIPOS.length - criados} já existentes.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
