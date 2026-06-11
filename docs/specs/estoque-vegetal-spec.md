# Spec: Estoque de Vegetal

**Versão:** 1.0
**Status:** Implementada (gap de autorização corrigido em 2026-06-10 — escrita restrita a ADMIN/GESTOR)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define o controle de estoque do vegetal por lotes: nome/preparo, origem, litros, localização (geladeira/fora) e notas, com totalização do volume disponível. Esta spec também fixa o comportamento de autorização correto, hoje ausente no módulo.

---

## 2. Contexto e Motivação

**Problema:** O volume de vegetal disponível era controlado de forma informal. Sem um registro de lotes com origem e localização, faltava visibilidade do total em estoque e de onde cada lote está guardado.

**Evidências:** O módulo `vegetal.js` e o modelo `VegetalLote` já registram lotes e somam o total. A avaliação arquitetural identificou que o módulo não aplica nenhuma verificação de papel — qualquer usuário autenticado, inclusive VISITANTE, pode alterar o estoque. É o gap de segurança 🔴 de maior prioridade.

**Por que agora:** O estoque é um ativo institucional sensível; o controle de acesso precisa ser corrigido antes de qualquer publicação.

---

## 3. Goals

- [ ] G-01: O responsável vê o total de vegetal disponível e a distribuição por lote e localização.
- [ ] G-02: Apenas usuários autorizados alteram o estoque, reduzindo endpoints sem autorização de 4 para 0.
- [ ] G-03: A listagem do estoque responde em menos de 200ms.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Endpoints de escrita sem authz | 3 | 0 | 7 dias |
| Endpoints de leitura sem authz | 1 | 0 | 7 dias |
| Latência de listagem P95 | ~100ms | < 200ms | contínuo |

---

## 4. Non-Goals

- NG-01: Não debita o estoque automaticamente a partir das sessões nesta versão (reconciliação manual).
- NG-02: Não controla validade nem temperatura por lote além da localização geladeira/fora.
- NG-03: Não gera ordem de preparo nem rastreabilidade completa de origem nesta versão.

---

## 5. Usuários e Personas

**Usuário primário:** Responsável pelo estoque (papel GESTOR ou ADMIN) que registra lotes e acompanha o total.
**Usuário secundário:** Membro autorizado que consulta o volume disponível.

**Jornada atual (sem a feature):** Contagem informal, sem total consolidado nem registro de localização.

**Jornada futura (com a feature):** O responsável registra cada lote com litros e localização, e o sistema mostra o total disponível com acesso restrito a quem é autorizado.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário autorizado deve poder cadastrar lote com nome e litros obrigatórios | Must | POST sem nome ou litros retorna 400 |
| RF-02 | O sistema deve aceitar origem, localização (GELADEIRA/FORA/OUTRO) e notas opcionais | Must | Localização default FORA quando ausente |
| RF-03 | O sistema deve listar os lotes e o total de litros somado | Must | GET retorna total coerente com a soma dos lotes |
| RF-04 | O sistema deve exigir papel autorizado (GESTOR/ADMIN) para criar, editar e excluir lote | Must | VISITANTE/MEMBRO recebe 403 ao alterar |
| RF-05 | O sistema deve exigir autenticação e autorização também na leitura do estoque | Must | Requisição sem papel autorizado de leitura recebe 403 |
| RF-06 | O usuário autorizado deve poder atualizar litros e localização de um lote | Should | PUT aplica a mudança e recalcula o total na listagem |

### 6.2 Fluxo Principal (Happy Path)

1. O responsável autenticado registra um lote informando nome, litros e localização.
2. O sistema valida o papel autorizado e persiste o lote.
3. O responsável consulta o estoque.
4. O sistema soma os litros de todos os lotes e retorna o total com a lista.
5. Resultado: o responsável enxerga o volume disponível e onde cada lote está guardado.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Ajuste de lote existente:**
1. O responsável corrige os litros de um lote após uma sessão.
2. O sistema atualiza o lote e reflete o novo total na próxima listagem.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Segurança | 100% dos endpoints exigem papel autorizado | Correção do gap atual é bloqueante para produção |
| RNF-02 | Performance | Listagem P95 < 200ms | Soma em memória |
| RNF-03 | Integridade | Litros sempre numéricos e não negativos | Validar entrada antes de persistir |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/vegetal.js`, tela de estoque em `app/app/(tabs)/more.tsx`.

**Comportamento esperado:** A tela exibe o total disponível em destaque e a lista de lotes por localização; apenas usuários autorizados veem botões de edição.

**Estados da UI:**
- Estado vazio: aviso de que não há lotes registrados.
- Estado de carregamento: indicador enquanto carrega o estoque.
- Estado de erro: aviso de falha com opção de recarregar.
- Estado de sucesso: total em destaque e lista de lotes.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
VegetalLote {
  id: String (cuid, PK)
  nome: String          // ex: preparo e origem do lote
  origem: String?
  litros: Float         // não negativo
  local: String         // GELADEIRA | FORA | OUTRO (default FORA)
  notas: String?
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Migrações necessárias:** Não para os campos atuais. A correção de autorização é de código, não de schema.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Spec de Autenticação e Autorização | Obrigatória | Sem papel não há como restringir o acesso ao estoque |
| Spec de Controle de Sessões | Opcional | Reconciliação de consumo é manual nesta versão |
| Prisma + banco | Obrigatória | Indisponibilidade retorna 500 |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Usuário sem papel autorizado tenta escrever | VISITANTE/MEMBRO em POST/PUT/DELETE | Retorna 403 (corrige o gap atual) |
| EC-02: Litros negativos ou não numéricos | Valor inválido em litros | Retorna 400 sem persistir |
| EC-03: Exclusão de lote inexistente | DELETE com id inválido | Retorna 404 |
| EC-04: Listagem com estoque vazio | Nenhum lote cadastrado | Retorna total 0 e lista vazia |
| EC-05: Falha do banco | Banco indisponível ou timeout | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório em todos os endpoints.
- **Autorização:** Leitura e escrita restritas a papel autorizado (GESTOR/ADMIN); corrigir o gap onde hoje qualquer autenticado altera o estoque.
- **Dados sensíveis:** Informação de ativo institucional; restrita a usuários autorizados.
- **Auditoria:** Recomendado registrar alterações de lote (quem, quando, litros antes/depois).

---

## 13. Plano de Rollout

- **Estratégia:** Correção de autorização como quick win prioritário, seguida de validação de entrada.
- **Como reverter (rollback):** Reverter o commit do guard; dados de lote permanecem íntegros.
- **Monitoramento pós-deploy:** Observar taxa de 403 e tentativas de escrita por papéis não autorizados.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | O estoque é global ou deve ser vinculado a uma agenda institucional específica? | Alto | Daniel | 15 dias |
| OQ-02 | Quais papéis exatos podem escrever: apenas ADMIN, ou também GESTOR? | Alto | Daniel | 7 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Estoque por lotes | Saldo único agregado | Permite origem, localização e rastreio por lote |
| Total somado na API | Campo de total persistido | Evita divergência entre soma e total armazenado |
| Corrigir authz antes de publicar | Adiar para depois | Risco de segurança alto e correção de baixo custo |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/routes/vegetal.js`

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-10 | Daniel | Criação inicial; registra o gap de autorização a corrigir |

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
