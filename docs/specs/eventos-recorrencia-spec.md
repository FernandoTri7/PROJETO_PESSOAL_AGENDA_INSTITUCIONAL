# Spec: Eventos e Recorrência

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define o cadastro, consulta e expansão de eventos de agenda, incluindo categorias, cores, lembretes e recorrência baseada num subconjunto da RRULE do iCalendar. A consulta expande as ocorrências de eventos recorrentes dentro de um período solicitado.

---

## 2. Contexto e Motivação

**Problema:** Compromissos institucionais e pessoais se repetem (semanal, mensal, anual). Guardar cada ocorrência individualmente seria custoso e difícil de editar; a recorrência precisa ser declarada uma vez e expandida sob demanda.

**Evidências:** O módulo `events.js` e a função pura `expandRecurrences` já implementam FREQ/INTERVAL/COUNT/UNTIL, com limite de 366 ocorrências por evento.

**Por que agora:** A recorrência é um subconjunto próprio da RRULE; sem contrato explícito, a exportação ICS e a integração futura com o Google Agenda podem divergir do comportamento interno.

---

## 3. Goals

- [ ] G-01: O usuário pode declarar uma recorrência uma vez e ver todas as ocorrências dentro de um período.
- [ ] G-02: A consulta por período retorna ocorrências em ordem cronológica em menos de 200ms para 1 agenda típica.
- [ ] G-03: A pesquisa textual localiza eventos por título, descrição ou local.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Latência GET /events por período P95 | ~150ms | < 200ms | contínuo |
| Limite de ocorrências expandidas por evento | 366 | 366 | contínuo |
| Tipos de FREQ suportados | 4 | 4 | contínuo |

---

## 4. Non-Goals

- NG-01: Não suporta BYDAY, BYMONTHDAY nem exceções de data (EXDATE) nesta versão.
- NG-02: Não implementa edição de ocorrência única de uma série recorrente (apenas a série inteira).
- NG-03: Não implementa fuso horário por evento; usa o horário recebido como está.

---

## 5. Usuários e Personas

**Usuário primário:** Membro que registra reuniões, sessões e compromissos com datas e repetições.
**Usuário secundário:** Membro VIEWER que apenas consulta a agenda compartilhada.

**Jornada atual (sem a feature):** Anotações soltas de horários repetidos, recriadas manualmente a cada ocorrência.

**Jornada futura (com a feature):** O usuário cria o evento com uma regra de repetição, e o sistema mostra cada ocorrência no período consultado.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder criar evento com título, início e agenda obrigatórios | Must | POST sem title/start/calendarId retorna 400 |
| RF-02 | O sistema deve recusar criar/editar evento sem papel de escrita na agenda | Must | EDITOR cria; VIEWER recebe 403 |
| RF-03 | O sistema deve aceitar categoria, cor, local, descrição, allDay, lembretes e rrule opcionais | Must | Campos opcionais persistidos quando enviados |
| RF-04 | O sistema deve expandir recorrências FREQ=DAILY/WEEKLY/MONTHLY/YEARLY com INTERVAL, COUNT e UNTIL | Must | GET por período retorna as ocorrências esperadas marcadas com occurrence=true |
| RF-05 | O sistema deve filtrar eventos por período (from/to) e por agendas (calendarIds) | Must | Eventos fora do período não retornam |
| RF-06 | O sistema deve restringir a consulta às agendas do usuário (ADMIN vê todas) | Must | calendarIds de terceiros são ignorados para MEMBRO |
| RF-07 | O usuário deve poder pesquisar eventos por texto em título, descrição ou local | Should | GET com q filtra por substring |
| RF-08 | O sistema deve limitar a expansão a 366 ocorrências por evento | Should | Série infinita para em 366 |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário cria um evento com título, início, fim e a regra de recorrência semanal.
2. O sistema valida o papel de escrita e persiste o evento com a rrule.
3. O usuário consulta a agenda informando o período da semana atual.
4. O sistema expande a recorrência e retorna as ocorrências do período em ordem cronológica.
5. Resultado: o usuário enxerga cada ocorrência da série dentro do intervalo consultado.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Evento sem recorrência:**
1. O usuário cria um evento sem rrule.
2. O sistema retorna o evento apenas se o início estiver dentro do período consultado.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | GET por período P95 < 200ms | Expansão em memória |
| RNF-02 | Segurança | Consulta restrita às agendas do usuário | Filtro por CalendarMember |
| RNF-03 | Robustez | Limite de 366 ocorrências por evento | Evita laço infinito em série sem fim |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/events.js`, `server/src/lib/recurrence.js`, telas `app/app/(tabs)/index.tsx` e `app/app/event-form.tsx`.

**Comportamento esperado:** O calendário mostra os eventos do período; ocorrências recorrentes aparecem repetidas conforme a regra. O formulário permite definir repetição e lembretes.

**Estados da UI:**
- Estado vazio: aviso de que não há eventos no período.
- Estado de carregamento: indicador enquanto busca o período.
- Estado de erro: aviso de falha com opção de recarregar.
- Estado de sucesso: lista/grade de eventos ordenada por início.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
Event {
  id: String (cuid, PK)
  calendarId: String
  creatorId: String
  title: String
  description: String?
  location: String?
  start: DateTime
  end: DateTime
  allDay: Boolean
  category: String        // REUNIAO | SESSAO | TRABALHO | FAMILIA | VIAGEM | OUTRO
  color: String?
  rrule: String?          // subconjunto iCalendar: FREQ/INTERVAL/COUNT/UNTIL
  reminders: String?      // minutos antes, separados por vírgula
  // índice (calendarId, start)
}
```

**Migrações necessárias:** Não para os campos atuais. Campo googleEventId pode ser adicionado por migração na integração futura, sem impacto.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Spec de Agendas e Compartilhamento | Obrigatória | Sem agenda não há onde criar eventos |
| Função expandRecurrences | Obrigatória | Sem expansão, recorrências não aparecem |
| Spec de Exportação e Backup | Opcional | Reusa a rrule no formato ICS |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: rrule malformada | FREQ ausente ou inválida | Trata como evento único, sem falha |
| EC-02: Série sem COUNT nem UNTIL | Recorrência infinita | Expansão para em 366 ocorrências |
| EC-03: Período invertido (from > to) | Parâmetros trocados | Retorna lista vazia sem erro |
| EC-04: calendarIds de outra pessoa | Tentativa de ler agenda alheia | Ignora os ids não permitidos |
| EC-05: Falha do banco na consulta | Banco indisponível ou timeout | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório.
- **Autorização:** Leitura restrita a membros da agenda; escrita exige OWNER/EDITOR.
- **Dados sensíveis:** Conteúdo de eventos pode conter informação pessoal; isolado por agenda.
- **Auditoria:** Opcional para criação/edição de eventos.

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; evoluções de RRULE entram de forma incremental.
- **Como reverter (rollback):** Reverter alterações na função de expansão sem afetar dados persistidos.
- **Monitoramento pós-deploy:** Observar latência da consulta por período e contagem de ocorrências expandidas.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | Editar uma ocorrência isolada de uma série será necessário? | Médio | Daniel | 60 dias |
| OQ-02 | Suportaremos BYDAY (ex.: toda segunda e quarta) nesta linha de produto? | Médio | Daniel | 60 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Subconjunto próprio de RRULE | Biblioteca RRULE completa | Menor dependência; cobre os casos atuais |
| Expansão sob demanda na consulta | Materializar ocorrências no banco | Edita a série inteira sem reescrever registros |
| Limite de 366 ocorrências | Sem limite | Evita laço infinito e respostas gigantes |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/routes/events.js` e `server/src/lib/recurrence.js`

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
