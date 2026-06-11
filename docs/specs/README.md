# Specs — Agenda Institucional e Pessoal

Especificações no formato **SDD (RFC Pragmático + LLM-First)**, geradas a partir do código existente e da avaliação arquitetural em [../architecture.md](../architecture.md). Cada spec é autossuficiente: um desenvolvedor (ou um agente) consegue implementar/evoluir o módulo sem perguntas adicionais.

Avaliadas com `.claude/skills/sdd-spec/scripts/spec_scorer.py` em 2026-06-10.

## Índice

| Spec | Módulo | Status | Score |
|------|--------|--------|-------|
| [autenticacao-autorizacao-spec.md](autenticacao-autorizacao-spec.md) | Auth: cadastro, login JWT, papéis | Implementada | 100/100 ⭐ |
| [agendas-compartilhamento-spec.md](agendas-compartilhamento-spec.md) | Agendas múltiplas e compartilhamento | Implementada | 100/100 ⭐ |
| [eventos-recorrencia-spec.md](eventos-recorrencia-spec.md) | Eventos + RRULE | Implementada | 100/100 ⭐ |
| [tarefas-spec.md](tarefas-spec.md) | Tarefas com prioridade e prazo | Implementada | 100/100 ⭐ |
| [aniversarios-spec.md](aniversarios-spec.md) | Aniversários + faixa etária | Implementada | 100/100 ⭐ |
| [controle-sessoes-spec.md](controle-sessoes-spec.md) | Controle de Sessões (institucional) | Implementada | 100/100 ⭐ |
| [estoque-vegetal-spec.md](estoque-vegetal-spec.md) | Estoque de Vegetal | Implementada (gap de authz corrigido) | 100/100 ⭐ |
| [exportacao-backup-spec.md](exportacao-backup-spec.md) | Exportação ICS + backup JSON | Implementada | 100/100 ⭐ |
| [seguranca-operacao-spec.md](seguranca-operacao-spec.md) | Hardening transversal pré-produção | Implementada (RF-01 a RF-08) + testes | 100/100 ⭐ |

## Como reavaliar uma spec

```powershell
$env:PYTHONIOENCODING = "utf-8"
python ..\..\.claude\skills\sdd-spec\scripts\spec_scorer.py --spec .\controle-sessoes-spec.md
```

## Prioridade de implementação (da avaliação arquitetural)

1. **Antes de publicar:** `seguranca-operacao-spec.md` (quick wins) + correção de authz em `estoque-vegetal-spec.md`.
2. **Próximo ciclo:** migrations, validação de entrada (zod), logger e primeiros testes.
3. **Quando houver volume:** paginação e agregação no banco (eventos e sessões).

## Paginação e agregação (item 8 — concluído)

Listagens aceitam paginação **opt-in**, sem quebrar o cliente (que segue recebendo arrays):

- Parâmetros: `?page=N&pageSize=M` (máx. 200) ou `?limit=M&offset=K`. Sem parâmetros, retorna a lista completa.
- Headers de resposta: `X-Total-Count` (sempre) e `X-Page`/`X-Page-Size` (quando paginado), expostos via CORS.
- Aplicada em `/events`, `/tasks`, `/sessions`, `/birthdays`.
- Agregação no banco: `/sessions/stats` (`aggregate` + `groupBy`) e total de `/vegetal` (`aggregate`), sem carregar registros em memória.
- Índices: `Task(calendarId, done)` e `Birthday(calendarId)` (migration `add_indexes_task_birthday`).

## Convenções

- IDs rastreáveis: `RF-xx` (funcional), `RNF-xx` (não-funcional), `NG-xx` (non-goal), `EC-xx` (edge case), `OQ-xx` (open question), `G-xx` (goal).
- Status: Rascunho → Em Revisão → Aprovada → Implementada.
- Toda mudança de comportamento deve atualizar a spec correspondente antes do código.
