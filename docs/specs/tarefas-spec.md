# Spec: Tarefas

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define o gerenciamento de tarefas vinculadas a uma agenda, com prioridade, prazo e marcação de conclusão. Permite acompanhar pendências pessoais e institucionais junto dos eventos.

---

## 2. Contexto e Motivação

**Problema:** Compromissos nem sempre têm hora marcada; pendências precisam de uma lista com prazo e prioridade separada dos eventos do calendário.

**Evidências:** O módulo `tasks.js` já oferece CRUD de tarefas por agenda, com prioridade e conclusão.

**Por que agora:** Documentar o contrato garante consistência de prioridade e prazo entre o app e a API antes de adicionar filtros e ordenações.

---

## 3. Goals

- [ ] G-01: O usuário registra pendências com prazo e prioridade e marca como concluídas.
- [ ] G-02: A listagem de tarefas de uma agenda responde em menos de 200ms para até 500 tarefas.
- [ ] G-03: Tarefas concluídas permanecem registradas para consulta histórica.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Latência de listagem P95 | ~120ms | < 200ms | contínuo |
| Níveis de prioridade | 3 | 3 | contínuo |
| Perda de tarefas ao concluir | 0 | 0 | contínuo |

---

## 4. Non-Goals

- NG-01: Não implementa subtarefas ou checklists aninhados nesta versão.
- NG-02: Não implementa atribuição de tarefa a outro usuário; a tarefa pertence a quem a criou na agenda.
- NG-03: Não implementa lembretes/notificações de prazo nesta versão.

---

## 5. Usuários e Personas

**Usuário primário:** Membro que organiza pendências com prazo dentro de uma agenda.
**Usuário secundário:** Membro VIEWER que consulta a lista compartilhada.

**Jornada atual (sem a feature):** Listas de afazeres em papel ou em outro app, desconectadas da agenda.

**Jornada futura (com a feature):** O usuário cria a tarefa na mesma agenda dos eventos, define prioridade e prazo, e marca como concluída ao terminar.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder criar tarefa com título e agenda obrigatórios | Must | POST sem title ou calendarId retorna 400 |
| RF-02 | O sistema deve aceitar descrição, prazo e prioridade BAIXA/MEDIA/ALTA opcionais | Must | Prioridade default MEDIA quando ausente |
| RF-03 | O sistema deve listar tarefas das agendas do usuário | Must | GET retorna apenas tarefas de agendas das quais é membro |
| RF-04 | O usuário deve poder marcar tarefa como concluída e reverter | Must | PUT done=true/false atualiza o estado |
| RF-05 | O sistema deve exigir papel de escrita para criar, editar e excluir | Must | VIEWER recebe 403 ao tentar alterar |
| RF-06 | O usuário deve poder excluir uma tarefa | Should | DELETE remove a tarefa e confirma ok |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário cria uma tarefa com título, prazo e prioridade na agenda ativa.
2. O sistema valida o papel de escrita e persiste a tarefa com done=false.
3. O usuário conclui a tarefa quando termina.
4. O sistema atualiza done=true mantendo o registro.
5. Resultado: a tarefa aparece como concluída sem ser apagada.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Reabrir tarefa concluída:**
1. O usuário marca uma tarefa concluída como pendente novamente.
2. O sistema define done=false e mantém o histórico de criação.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | Listagem P95 < 200ms | Até 500 tarefas por agenda |
| RNF-02 | Segurança | Escrita restrita a OWNER/EDITOR | Validado por requireCalendar |
| RNF-03 | Integridade | Tarefa sempre vinculada a uma agenda existente | Cascade ao excluir a agenda |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/tasks.js`, telas `app/app/(tabs)/tasks.tsx`.

**Comportamento esperado:** A lista exibe tarefas com prioridade e prazo; concluir aplica um indicador visual e move ou marca o item.

**Estados da UI:**
- Estado vazio: convite para criar a primeira tarefa.
- Estado de carregamento: indicador enquanto a lista carrega.
- Estado de erro: aviso de falha com opção de recarregar.
- Estado de sucesso: lista com pendentes e concluídas distinguíveis.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
Task {
  id: String (cuid, PK)
  calendarId: String
  userId: String
  title: String
  description: String?
  dueDate: DateTime?
  priority: String       // BAIXA | MEDIA | ALTA (default MEDIA)
  done: Boolean          // default false
  createdAt: DateTime
}
```

**Migrações necessárias:** Não para os campos atuais.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Spec de Agendas e Compartilhamento | Obrigatória | Sem agenda não há onde criar tarefas |
| Prisma + banco | Obrigatória | Indisponibilidade retorna 500 |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Título ausente | POST sem title | Retorna 400 com mensagem clara |
| EC-02: Prioridade inválida | Valor fora de BAIXA/MEDIA/ALTA | Trata como MEDIA ou retorna 400 (ver Open Question) |
| EC-03: VIEWER tenta alterar | PUT/DELETE por VIEWER | Retorna 403 |
| EC-04: Tarefa inexistente | PUT/DELETE com id inválido | Retorna 404 |
| EC-05: Falha do banco | Banco indisponível ou timeout | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório.
- **Autorização:** Leitura por membros da agenda; escrita por OWNER/EDITOR.
- **Dados sensíveis:** Conteúdo de tarefa pode conter informação pessoal; isolado por agenda.
- **Auditoria:** Não requerida nesta versão.

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; melhorias de filtro entram incrementalmente.
- **Como reverter (rollback):** Reverter commits sem afetar dados persistidos.
- **Monitoramento pós-deploy:** Observar latência da listagem e taxa de erro de validação.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | Prioridade inválida deve retornar 400 ou cair em MEDIA? | Baixo | Daniel | 30 dias |
| OQ-02 | Tarefas terão lembrete de prazo como os eventos? | Médio | Daniel | 60 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Tarefa vinculada à agenda | Lista global por usuário | Reusa o modelo de compartilhamento e isolamento |
| Conclusão como booleano | Estados múltiplos (a fazer/fazendo/feito) | Simplicidade adequada ao uso atual |
| Manter concluídas | Apagar ao concluir | Permite consulta histórica |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/routes/tasks.js`

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
