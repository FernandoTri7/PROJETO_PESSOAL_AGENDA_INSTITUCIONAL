// Fase 1 — Backfill da identidade central.
// Cria o projeto "agenda", gera um Membership por usuário existente e define o gestor.
// Idempotente: pode rodar várias vezes (usa upsert na unique userId_projectId / key).
// Ver docs/arquitetura-identidade-central.md
//
// Uso: node prisma/backfillIdentity.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Decisões do time (2026-06-12):
//  - Gestor do projeto agenda: fernando@tri7.com.br (conta institucional real).
//  - Demais usuários entram como MEMBRO (papéis antigos não são copiados; promove-se depois).
const PROJECT_KEY = 'agenda'
const PROJECT_NAME = 'Agenda Institucional'
const GESTOR_EMAIL = 'fernando@tri7.com.br'

async function main() {
  const gestor = await prisma.user.findUnique({ where: { email: GESTOR_EMAIL } })
  if (!gestor) throw new Error(`Gestor ${GESTOR_EMAIL} não encontrado — abortando.`)

  // 1) Projeto (cria se não existir; não sobrescreve owner num re-run).
  const project = await prisma.project.upsert({
    where: { key: PROJECT_KEY },
    update: {},
    create: { key: PROJECT_KEY, name: PROJECT_NAME, ownerUserId: gestor.id },
  })

  // 2) Garante o ownerUserId apontando para o gestor (corrige projeto pré-existente sem owner).
  if (project.ownerUserId !== gestor.id) {
    await prisma.project.update({ where: { id: project.id }, data: { ownerUserId: gestor.id } })
  }

  // 3) Um Membership por usuário: gestor = GESTOR, restante = MEMBRO. Todos ativos.
  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  for (const u of users) {
    const role = u.id === gestor.id ? 'GESTOR' : 'MEMBRO'
    await prisma.membership.upsert({
      where: { userId_projectId: { userId: u.id, projectId: project.id } },
      update: { role, active: true },
      create: { userId: u.id, projectId: project.id, role, active: true },
    })
  }

  // 4) Relatório.
  const memberships = await prisma.membership.findMany({
    where: { projectId: project.id },
    include: { user: { select: { email: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  console.log(`Projeto: ${project.name} (key=${project.key}, id=${project.id})`)
  console.log(`Gestor (ownerUserId): ${gestor.email}`)
  console.log('Vínculos:')
  for (const m of memberships) {
    console.log(`  - ${m.user.email}: ${m.role}${m.active ? '' : ' (inativo)'}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
