# Spec: Controle de Sessões

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define o registro institucional de sessões: tipo, equipe (dirigente, assistente, auxiliares, som), leitura de documentos, explanação, dados do vegetal (preparo, litros coado/comungado/retorno) e contagem de copos, além de estatísticas agregadas por período. A estrutura deriva dos registros reais do histórico da Assistência.

---

## 2. Contexto e Motivação

**Problema:** As sessões eram registradas em mensagens de texto, sem padronização nem totalização. Recuperar quem dirigiu, quanto vegetal foi coado ou quantos copos foram servidos exigia leitura manual de todo o histórico.

**Evidências:** O módulo `sessions.js` e o modelo `SessionRecord` já estruturam os campos derivados dos registros reais; existe endpoint de estatísticas. Material de referência está na pasta `Imagens/`.

**Por que agora:** É o módulo institucional central do produto; padronizar o registro e a estatística destrava relatórios e continuidade administrativa.

---

## 3. Goals

- [ ] G-01: O usuário registra uma sessão completa em um único formulário estruturado.
- [ ] G-02: O sistema totaliza copos e litros por período sem cálculo manual.
- [ ] G-03: A consulta de sessões por período e tipo responde em menos de 200ms para 1 agenda típica.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Tempo de registro de uma sessão | ~10min em texto livre | < 3min no formulário | 30 dias |
| Latência GET /sessions por período P95 | ~150ms | < 200ms | contínuo |
| Tipos de sessão suportados | 9 | 9 | contínuo |

---

## 4. Non-Goals

- NG-01: Não controla escala futura de pessoas (quem dirige nas próximas datas) nesta versão; registra o que ocorreu.
- NG-02: Não calcula automaticamente o saldo de estoque a partir das sessões; o estoque é gerido na spec de Estoque de Vegetal.
- NG-03: Não gera relatório em PDF nesta versão; a saída é JSON e as estatísticas via API.

---

## 5. Usuários e Personas

**Usuário primário:** Responsável pela Assistência que registra cada sessão e consulta os totais.
**Usuário secundário:** Gestor institucional que acompanha estatísticas por período.

**Jornada atual (sem a feature):** Registro em mensagens de texto, sem totalização nem busca estruturada.

**Jornada futura (com a feature):** O responsável preenche o formulário da sessão, e o sistema guarda os dados e calcula os totais por período e por tipo.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder registrar uma sessão com agenda e data obrigatórias | Must | POST sem calendarId ou date retorna 400 |
| RF-02 | O sistema deve aceitar tipo de sessão entre os 9 valores definidos (default ESCALA) | Must | Tipo ausente assume ESCALA |
| RF-03 | O sistema deve registrar a equipe: dirigente, assistente, auxiliares, som, leitura e explanação | Must | Campos de texto persistidos quando enviados |
| RF-04 | O sistema deve registrar dados do vegetal: descrição e litros coado, comungado e retorno | Must | Valores numéricos persistidos como número |
| RF-05 | O sistema deve registrar copos: simples, duplos, crianças e repetições | Must | Valores inteiros persistidos quando enviados |
| RF-06 | O usuário deve poder filtrar sessões por período (from/to), tipo e texto | Must | GET com type filtra por tipo; q busca em título, dirigente e descrição do vegetal |
| RF-07 | O sistema deve fornecer estatísticas agregadas de copos, litros e contagem por tipo no período | Must | GET /sessions/stats retorna totais coerentes com os registros |
| RF-08 | O sistema deve exigir papel de escrita para criar, editar e excluir sessão | Must | VIEWER recebe 403 ao alterar |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário abre o formulário de sessão e informa data, tipo e equipe.
2. O usuário preenche os dados do vegetal e a contagem de copos.
3. O sistema valida o papel de escrita e persiste a sessão na agenda.
4. O usuário consulta as estatísticas do mês informando o período.
5. Resultado: o sistema retorna os totais de copos, litros e a contagem por tipo de sessão.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Edição posterior de uma sessão:**
1. O usuário corrige a contagem de copos de uma sessão já registrada.
2. O sistema atualiza apenas os campos enviados, preservando os demais.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | GET por período P95 < 200ms | Inclui índice (calendarId, date) |
| RNF-02 | Segurança | Escrita restrita a OWNER/EDITOR | Validado por requireCalendar |
| RNF-03 | Escala | Estatística eficiente acima de 1000 sessões | ✅ Agregação movida para o banco (`aggregate`/`groupBy`) em 2026-06-10; listagem com paginação opt-in |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/sessions.js`, modelo `SessionRecord`, telas `app/app/(tabs)/sessions.tsx` e `app/app/session-form.tsx`.

**Comportamento esperado:** O formulário agrupa equipe, vegetal e copos em seções; a tela de listagem mostra sessões por data com totais do período.

**Estados da UI:**
- Estado vazio: convite para registrar a primeira sessão.
- Estado de carregamento: indicador enquanto carrega a lista ou as estatísticas.
- Estado de erro: aviso de falha com opção de recarregar.
- Estado de sucesso: lista por data e painel de totais do período.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
SessionRecord {
  id: String (cuid, PK)
  calendarId: String
  creatorId: String
  date: DateTime
  type: String            // ESCALA | ESCALA_ANUAL | INSTRUTIVA | EXTRA | ADVENTICIOS | DIRECAO | QUADRO_DE_MESTRES | COMEMORATIVA | OUTRA
  title: String?
  dirigente: String?
  assistente: String?
  auxAssistente: String?
  som: String?
  leituraDocumentos: String?
  explanacao: String?
  vegetalDescricao: String?
  coadoLitros: Float?
  comungadoLitros: Float?
  retornoLitros: Float?
  coposSimples: Int?
  coposDuplos: Int?
  coposCriancas: Int?
  repeticoes: Int?
  observacoes: String?
  createdAt: DateTime
  updatedAt: DateTime
  // índice (calendarId, date)
}
```

**Migrações necessárias:** Não para os campos atuais.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Spec de Agendas e Compartilhamento | Obrigatória | Sem agenda institucional não há onde registrar sessões |
| Spec de Estoque de Vegetal | Opcional | Reconciliação de litros entre sessão e estoque é manual nesta versão |
| Prisma + banco | Obrigatória | Indisponibilidade retorna 500 |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Litros como texto não numérico | Campo coadoLitros com valor inválido | parseFloat resulta em valor inválido; tratar como null ou retornar 400 (ver Open Question) |
| EC-02: Estatística sem registros no período | Período sem sessões | Retorna totais zerados sem falha |
| EC-03: Tipo de sessão fora da lista | type desconhecido | Persiste o valor enviado; relatório agrupa em porTipo (ver Open Question sobre validação) |
| EC-04: Edição parcial | PUT com poucos campos | Atualiza apenas os campos enviados, preserva o resto |
| EC-05: Falha do banco | Banco indisponível ou timeout | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório.
- **Autorização:** Leitura por membros da agenda; escrita por OWNER/EDITOR.
- **Dados sensíveis:** Nomes de participantes são PII institucional; isolados por agenda.
- **Auditoria:** Recomendado registrar criação e edição de sessões para continuidade administrativa.

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; agregação no banco entra quando o volume crescer.
- **Como reverter (rollback):** Reverter commits sem afetar dados persistidos.
- **Monitoramento pós-deploy:** Observar latência da listagem e coerência dos totais de estatística.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | O tipo de sessão deve ser validado contra a lista fechada (rejeitar desconhecidos)? | Médio | Daniel | 30 dias |
| OQ-02 | Litros inválidos devem retornar 400 ou virar null? | Baixo | Daniel | 30 dias |
| OQ-03 | A sessão deve debitar o estoque de vegetal automaticamente? | Alto | Daniel | 60 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Estrutura derivada dos registros reais | Modelo genérico de evento | Fidelidade ao processo institucional existente |
| Estatística agregada na API | Pré-calcular e armazenar totais | Simplicidade no volume atual |
| Campos do vegetal na própria sessão | Tabela separada de consumo | Registro único por sessão facilita o preenchimento |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Detalhe do módulo em `docs/MODULO-SESSOES.md`
- Implementação em `server/src/routes/sessions.js`

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
