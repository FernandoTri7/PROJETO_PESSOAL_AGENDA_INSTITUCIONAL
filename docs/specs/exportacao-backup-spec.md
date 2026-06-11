# Spec: Exportação e Backup

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define a exportação de uma agenda no formato iCalendar (.ics), compatível com o Google Agenda, e o backup/importação do conteúdo de uma agenda em JSON (eventos, tarefas, aniversários e sessões). Permite levar os dados para fora do sistema e restaurá-los.

---

## 2. Contexto e Motivação

**Problema:** Os dados da agenda ficam presos ao sistema; o usuário precisa de uma forma de visualizar os eventos em ferramentas externas e de guardar uma cópia de segurança recuperável.

**Evidências:** O módulo `export.js` já gera ICS por agenda e expõe backup/importação JSON, com verificação de papel.

**Por que agora:** A integração bidirecional com o Google Agenda é futura; a exportação ICS é o caminho de curto prazo já disponível e precisa de contrato documentado.

---

## 3. Goals

- [ ] G-01: O usuário exporta uma agenda e a importa no Google Agenda via arquivo .ics.
- [ ] G-02: O usuário gera um backup JSON completo de uma agenda e o restaura.
- [ ] G-03: A exportação de uma agenda típica completa em menos de 2s.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Compatibilidade do .ics com Google Agenda | importa | importa sem erro | contínuo |
| Tempo de exportação de agenda típica | ~1s | < 2s | contínuo |
| Entidades cobertas no backup JSON | 4 | 4 | contínuo |

---

## 4. Non-Goals

- NG-01: Não sincroniza bidirecionalmente com o Google Agenda nesta versão (apenas exporta .ics).
- NG-02: Não exporta o estoque de vegetal nem usuários; o backup cobre conteúdo da agenda.
- NG-03: Não faz deduplicação na importação; reimportar duplica os registros.

---

## 5. Usuários e Personas

**Usuário primário:** Membro que deseja ver a agenda no Google Agenda ou guardar uma cópia de segurança.
**Usuário secundário:** Administrador que migra ou restaura dados de uma agenda.

**Jornada atual (sem a feature):** Dados confinados ao app, sem cópia externa nem visualização em ferramentas conhecidas.

**Jornada futura (com a feature):** O usuário baixa o .ics e importa no Google Agenda, ou guarda o JSON como backup e o reimporta quando precisar.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder exportar uma agenda como arquivo .ics | Must | GET /export/ics/:calendarId retorna text/calendar com os eventos |
| RF-02 | O sistema deve incluir título, datas, local, descrição e rrule de cada evento no .ics | Must | Evento com recorrência traz a linha RRULE |
| RF-03 | O usuário deve poder baixar um backup JSON com eventos, tarefas, aniversários e sessões | Must | GET /export/json/:calendarId retorna as quatro coleções |
| RF-04 | O usuário deve poder importar eventos e aniversários a partir de um JSON | Must | POST /export/json/:calendarId cria os registros e retorna a contagem importada |
| RF-05 | O sistema deve exigir papel de leitura para exportar e de escrita para importar | Must | VIEWER exporta; importação por VIEWER retorna 403 |
| RF-06 | O sistema deve escapar caracteres especiais no .ics (ponto e vírgula, vírgula, quebra de linha) | Should | Texto com ; ou , gera .ics válido |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário solicita a exportação de uma agenda da qual é membro.
2. O sistema confirma o papel de leitura e monta o arquivo iCalendar dos eventos.
3. O sistema responde com o arquivo .ics anexado.
4. O usuário importa o arquivo no Google Agenda.
5. Resultado: os eventos da agenda aparecem no calendário externo.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Restauração de backup:**
1. O usuário envia um JSON de backup para uma agenda com papel de escrita.
2. O sistema cria os eventos e aniversários do arquivo e retorna quantos foram importados.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | Exportação de agenda típica < 2s | Eventos sem expansão de recorrência no ICS |
| RNF-02 | Compatibilidade | .ics aderente ao VCALENDAR 2.0 | Importável no Google Agenda |
| RNF-03 | Segurança | Exportar exige leitura; importar exige escrita | Validado por requireCalendar |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/export.js`, opções de exportação/backup em `app/app/(tabs)/more.tsx`.

**Comportamento esperado:** O usuário escolhe a agenda e a ação (exportar .ics, baixar JSON, importar JSON); o app baixa ou envia o arquivo.

**Estados da UI:**
- Estado vazio: aviso quando a agenda não tem conteúdo a exportar.
- Estado de carregamento: indicador durante a geração do arquivo.
- Estado de erro: aviso de falha na exportação ou importação.
- Estado de sucesso: confirmação com a quantidade exportada ou importada.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:** Nenhuma entidade nova. Lê e escreve Event, Task, Birthday e SessionRecord existentes.

**Formato do backup JSON:**

```
Backup {
  events: Event[]
  tasks: Task[]
  birthdays: Birthday[]
  sessions: SessionRecord[]
}
```

**Migrações necessárias:** Não.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Google Agenda | Opcional | Sem ele a exportação ainda gera o arquivo, sem destino externo |
| Spec de Eventos e Recorrência | Obrigatória | Reusa a rrule no formato ICS |
| Prisma + banco | Obrigatória | Indisponibilidade retorna 500 |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Agenda sem eventos | Exportar agenda vazia | Gera .ics válido apenas com o cabeçalho |
| EC-02: Texto com caracteres especiais | Título com ; ou , ou quebra de linha | Caracteres escapados no .ics |
| EC-03: JSON de importação malformado | Estrutura inválida | Importa o que for válido ou retorna 400; falha não corrompe dados |
| EC-04: Importação por papel sem escrita | VIEWER em POST | Retorna 403 sem importar |
| EC-05: Falha do banco durante export | Banco indisponível ou timeout | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório.
- **Autorização:** Exportar exige papel de leitura na agenda; importar exige escrita.
- **Dados sensíveis:** O arquivo exportado contém PII da agenda; o usuário é responsável pelo destino do arquivo.
- **Auditoria:** Recomendado registrar exportações e importações.

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; sincronização bidirecional com Google é evolução futura.
- **Como reverter (rollback):** Reverter commits; a importação não tem rollback automático — orientar uso em agenda de teste antes.
- **Monitoramento pós-deploy:** Observar tempo de exportação e taxa de erro na importação.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | A importação deve deduplicar por id/UID para evitar registros repetidos? | Médio | Daniel | 45 dias |
| OQ-02 | A exportação .ics deve expandir as ocorrências ou manter apenas a RRULE? | Médio | Daniel | 45 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Exportar .ics no curto prazo | Sincronização Google imediata | Caminho de baixo custo e já compatível |
| Backup JSON por agenda | Backup global do banco | Granularidade por agenda e portabilidade |
| Importar sem deduplicar | Deduplicação automática | Simplicidade inicial; deduplicação em aberto |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/routes/export.js`

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
