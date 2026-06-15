// Seed idempotente das Sessões Anuais conhecidas. Reexecutável: não duplica (match por nome).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ANUAIS = [
  { nome: 'Dia de Reis', dia: 6, mes: 1, tipo: 'COMEMORATIVA' },
  { nome: 'Aniversário do Mestre', dia: 10, mes: 2, tipo: 'COMEMORATIVA' },
  { nome: 'Ressurreição do Mestre', dia: 27, mes: 3, tipo: 'COMEMORATIVA' },
  { nome: 'São João', dia: 23, mes: 6, tipo: 'COMEMORATIVA' },
  { nome: 'Recriação da UDV', dia: 22, mes: 7, tipo: 'COMEMORATIVA' },
  { nome: 'São Cosme e São Damião', dia: 27, mes: 9, tipo: 'COMEMORATIVA' },
  { nome: 'Aniversário do Núcleo', dia: 1, mes: 11, tipo: 'COMEMORATIVA' },
  { nome: 'Natal', dia: 25, mes: 12, tipo: 'COMEMORATIVA' },
  { nome: 'Passagem do Ano', dia: 31, mes: 12, tipo: 'EXTRA' },
];

async function main() {
  let criadas = 0;
  for (const s of ANUAIS) {
    const existing = await prisma.sessaoAnual.findFirst({ where: { nome: s.nome } });
    if (existing) continue;
    await prisma.sessaoAnual.create({ data: s });
    criadas++;
  }
  console.log(`Sessões anuais: ${criadas} criadas, ${ANUAIS.length - criadas} já existentes.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
