# Spec: Agendas e Compartilhamento

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define a criação de múltiplas agendas (pessoal, familiar, institucional) e o compartilhamento entre usuários por e-mail, com papéis OWNER, EDITOR e VIEWER. A agenda é a unidade de isolamento de dados de eventos, tarefas, aniversários e sessões.

---

## 2. Contexto e Motivação

**Problema:** Uma única agenda global não atende uso pessoal e institucional ao mesmo tempo; cada contexto precisa de visibilidade e permissão próprias, com compartilhamento controlado entre pessoas.

**Evidências:** O modelo `Calendar` + `CalendarMember` já existe e é a base de autorização de todos os módulos de conteúdo.

**Por que agora:** Formalizar o contrato de compartilhamento evita que módulos novos vazem dados entre agendas de usuários diferentes.

---

## 3. Goals

- [ ] G-01: Um usuário pode manter agendas separadas por contexto e compartilhar cada uma de forma independente.
- [ ] G-02: O acesso a conteúdo respeita o papel do usuário na agenda em 100% dos endpoints de conteúdo.
- [ ] G-03: Remover um membro revoga o acesso dele em menos de 1 requisição subsequente.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Vazamento de dados entre agendas | 0 conhecido | 0 | contínuo |
| Latência de listagem de agendas P95 | ~120ms | < 200ms | contínuo |
| Papéis suportados por agenda | 3 | 3 | contínuo |

---

## 4. Non-Goals

- NG-01: Não implementa convites por link público nesta versão; o compartilhamento exige e-mail de usuário já cadastrado.
- NG-02: Não implementa hierarquia de subagendas ou pastas.
- NG-03: Não implementa transferência de propriedade (OWNER) entre usuários nesta versão.

---

## 5. Usuários e Personas

**Usuário primário:** Usuário que organiza compromissos pessoais e institucionais e convida outras pessoas para colaborar.
**Usuário secundário:** Membro convidado que recebe acesso de leitura ou edição a uma agenda.

**Jornada atual (sem a feature):** Compartilhamento informal por mensagens, sem controle de quem edita o quê.

**Jornada futura (com a feature):** O dono cria a agenda, convida pessoas por e-mail definindo o papel, e cada uma vê apenas o que lhe foi liberado.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder criar uma agenda informando nome, tipo e cor | Must | POST /api/calendars cria a agenda com o criador como OWNER |
| RF-02 | O sistema deve listar apenas as agendas das quais o usuário é membro (ADMIN vê todas) | Must | GET /api/calendars não retorna agendas de terceiros para MEMBRO |
| RF-03 | O OWNER/EDITOR deve poder editar nome, tipo e cor da agenda | Must | PUT por VIEWER retorna 403; por EDITOR aplica a mudança |
| RF-04 | O OWNER/EDITOR deve poder adicionar membro por e-mail com papel OWNER, EDITOR ou VIEWER | Must | POST /:id/members cria ou atualiza o vínculo |
| RF-05 | O sistema deve recusar adicionar membro cujo e-mail não está cadastrado | Must | Retorna 404 "Usuário não encontrado" |
| RF-06 | O OWNER/EDITOR deve poder remover um membro da agenda | Must | DELETE /:id/members/:userId revoga o acesso |
| RF-07 | A exclusão de uma agenda deve remover em cascata seus eventos, tarefas, aniversários e sessões | Should | DELETE /api/calendars/:id apaga o conteúdo vinculado |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário cria uma agenda informando nome, tipo e cor.
2. O sistema registra a agenda e vincula o criador como OWNER.
3. O usuário adiciona um membro informando o e-mail e o papel desejado.
4. O sistema localiza o usuário pelo e-mail e cria o vínculo na agenda.
5. Resultado: o membro convidado passa a enxergar a agenda conforme o papel recebido.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Reconvite com novo papel:**
1. O dono adiciona um e-mail que já é membro.
2. O sistema atualiza o papel existente em vez de duplicar o vínculo (upsert).

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | Listagem de agendas P95 < 200ms | Inclui membros embutidos |
| RNF-02 | Segurança | Toda escrita exige papel OWNER/EDITOR | Validado por requireCalendar |
| RNF-03 | Consistência | Vínculo calendarId+userId é único | Garantido por índice único |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/calendars.js`, telas de seleção/gestão de agenda em `app/app/(tabs)/more.tsx`.

**Comportamento esperado:** O usuário escolhe a agenda ativa; donos veem opções de compartilhamento e exclusão; membros VIEWER veem o conteúdo sem botões de edição.

**Estados da UI:**
- Estado vazio: mensagem incentivando criar a primeira agenda.
- Estado de carregamento: indicador enquanto a lista carrega.
- Estado de erro: aviso de falha ao carregar com opção de tentar de novo.
- Estado de sucesso: lista de agendas com cor e tipo.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
Calendar {
  id: String (cuid, PK)
  name: String
  type: String        // PESSOAL | FAMILIAR | INSTITUCIONAL
  color: String        // hex, default #1a73e8
  createdAt: DateTime
}

CalendarMember {
  id: String (cuid, PK)
  calendarId: String
  userId: String
  role: String         // OWNER | EDITOR | VIEWER
  // único (calendarId, userId); cascade ao excluir agenda ou usuário
}
```

**Migrações necessárias:** Não para os campos atuais.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Spec de Autenticação e Autorização | Obrigatória | Sem identidade do usuário não há controle de acesso |
| Prisma + banco | Obrigatória | Indisponibilidade retorna 500 nas operações de agenda |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: VIEWER tenta editar | PUT/DELETE por papel VIEWER | Retorna 403 "Sem permissão nesta agenda" |
| EC-02: Convite a e-mail inexistente | E-mail não cadastrado | Retorna 404 sem criar vínculo |
| EC-03: Membro duplicado | E-mail já é membro | Atualiza o papel via upsert, não duplica |
| EC-04: Exclusão de agenda com conteúdo | DELETE em agenda com eventos | Remove conteúdo em cascata e confirma ok |
| EC-05: Falha do banco na listagem | Banco indisponível | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório em todos os endpoints.
- **Autorização:** Escrita exige OWNER/EDITOR; ADMIN global ignora a restrição.
- **Dados sensíveis:** E-mails de membros são PII; expostos apenas a membros da mesma agenda.
- **Auditoria:** Registrar adição e remoção de membros.

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; sem mudança de comportamento pendente.
- **Como reverter (rollback):** Reverter commits de ajuste; dados de vínculo permanecem íntegros.
- **Monitoramento pós-deploy:** Observar taxa de 403 e erros na adição de membros.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | Convite por link a quem ainda não tem conta entra em qual versão? | Médio | Daniel | 60 dias |
| OQ-02 | Transferência de propriedade entre usuários será necessária? | Baixo | Daniel | 90 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Compartilhar por e-mail de conta existente | Convite por link público | Menor superfície de risco no estágio atual |
| Upsert de membro | Erro ao reconvidar | Reconvite com novo papel sem fricção |
| Cascade na exclusão | Soft delete | Simplicidade; backup via export JSON cobre recuperação |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/routes/calendars.js`

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-10 | Daniel | Criação inicial (documentação retroativa) |

---

## Relatório de Avaliação (spec_scorer)

**Score:** 100/100 — ⭐ Excelente — Pronta para implementação

| Dimensão | Peso | Resultado |
|----------|------|-----------|
| Completude | 30% | 100% |
| Testabilidade | 25% | 100% |
| Clareza | 20% | 100% |
| Escopo | 15% | 100% |
| Edge Cases | 10% | 100% |

Avaliado em 2026-06-10 por `.claude/skills/sdd-spec/scripts/spec_scorer.py`.
