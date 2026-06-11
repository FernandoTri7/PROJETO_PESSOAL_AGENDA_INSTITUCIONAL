# Spec: Hardening de Segurança e Operação

**Versão:** 1.0
**Status:** Implementada em 2026-06-10 — RF-01 a RF-08 concluídos: JWT_SECRET obrigatório, rate limit no login, CORS por allowlist, validação zod, migrations Prisma (baseline), authz do estoque, `.env.example`, e logging estruturado com pino (RF-06). EC-06 coberto via express-async-errors. Suíte de testes (`node --test`) cobre recorrência, validação, rate limit e guards
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Spec transversal que reúne as correções de segurança e os fundamentos de operação que hoje não têm dono: segredo de JWT obrigatório, rate limiting no login, CORS por allowlist, validação de entrada, migrations versionadas, logging estruturado e variáveis de ambiente. É a checklist que separa o protótipo funcional de um sistema publicável.

---

## 2. Contexto e Motivação

**Problema:** A avaliação arquitetural pontuou Segurança em 2/5 e Observabilidade em 1/5. Há um segredo de JWT com fallback público no código, login sem rate limiting, CORS aberto, ausência de validação de schema, sem migrations versionadas e sem logs estruturados. Cada item é risco direto ao publicar a API em rede pública.

**Evidências:** `JWT_SECRET` cai em `'dev-secret-trocar-em-producao'` se a variável faltar; `app.use(cors())` libera qualquer origem; o schema usa `prisma db push` sem histórico; o tratamento de erro global usa apenas `console.error`.

**Por que agora:** São pré-requisitos de publicação; a maioria é de baixo custo e alto impacto (quick wins).

---

## 3. Goals

- [ ] G-01: A API recusa subir em produção sem JWT_SECRET definido por variável de ambiente.
- [ ] G-02: Tentativas de login são limitadas a no máximo 10 por IP a cada 15 minutos.
- [ ] G-03: 100% das mudanças de schema passam a ser versionadas por migrations.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Segredos com fallback inseguro no código | 1 | 0 | 7 dias |
| Endpoints de mutação sem validação de entrada | maioria | 0 | 30 dias |
| Cobertura de logs estruturados nas rotas | 0% | 100% | 30 dias |

---

## 4. Non-Goals

- NG-01: Não implementa WAF, proteção DDoS de borda nem CDN nesta versão.
- NG-02: Não implementa SSO corporativo nem MFA nesta versão.
- NG-03: Não migra o banco para PostgreSQL nesta spec; apenas habilita migrations e deixa o caminho pronto.

---

## 5. Usuários e Personas

**Usuário primário:** Operador/mantenedor que publica e monitora a API.
**Usuário secundário:** Desenvolvedor que evolui o schema e precisa de migrations confiáveis.

**Jornada atual (sem a feature):** Deploy manual, segredo default, sem logs úteis e schema aplicado por push sem histórico.

**Jornada futura (com a feature):** O deploy exige variáveis de ambiente, recusa subir sem segredo, registra logs estruturados e aplica migrations versionadas com rollback.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve exigir JWT_SECRET via variável de ambiente e abortar a inicialização em produção sem ele | Must | Subir sem JWT_SECRET em produção encerra o processo com erro claro |
| RF-02 | O sistema deve aplicar rate limiting no login: no máximo 10 tentativas por IP a cada 15 minutos | Must | A 11ª tentativa no intervalo retorna 429 |
| RF-03 | O sistema deve restringir o CORS a uma allowlist de origens configurável por ambiente | Must | Origem fora da allowlist é bloqueada |
| RF-04 | O sistema deve validar o corpo das requisições de mutação contra um schema, rejeitando entrada inválida com 400 | Must | Payload com tipo errado retorna 400, não 500 |
| RF-05 | O sistema deve adotar migrations versionadas do Prisma em vez de db push | Must | Mudança de schema gera arquivo de migration aplicável e reversível |
| RF-06 | O sistema deve emitir logs estruturados com nível, timestamp e identificador de requisição | Must | Cada requisição produz um log estruturado correlacionável |
| RF-07 | O sistema deve corrigir o módulo de estoque para exigir papel autorizado em todos os endpoints | Must | VISITANTE recebe 403 em qualquer operação de estoque |
| RF-08 | O projeto deve fornecer um arquivo de exemplo de variáveis de ambiente | Should | Existe um .env.example com as chaves necessárias e sem segredos reais |

### 6.2 Fluxo Principal (Happy Path)

1. O operador define as variáveis de ambiente (segredo, origens permitidas, porta) no ambiente de deploy.
2. A API valida na inicialização que o segredo está presente.
3. A API sobe com CORS por allowlist, rate limiting no login e logs estruturados ativos.
4. Uma mudança de schema é aplicada por migration versionada e reversível.
5. Resultado: o sistema opera com os controles de segurança e observabilidade ativos.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Inicialização sem segredo em produção:**
1. A variável JWT_SECRET não está definida e o ambiente é produção.
2. A API registra um erro claro e encerra o processo sem atender requisições.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Segurança | Segredo com no mínimo 32 caracteres | Gerado fora do código |
| RNF-02 | Disponibilidade | Rate limiting não afeta tráfego legítimo abaixo do limite | 10 por IP a cada 15 min |
| RNF-03 | Observabilidade | Logs estruturados em JSON | Correlacionáveis por requestId |
| RNF-04 | Reversibilidade | Toda migration tem caminho de rollback | Sem perda de dados em rollback planejado |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/index.js` (CORS, error handler, logger), `server/src/lib/auth.js` (segredo), `server/src/routes/auth.js` (rate limit), `server/src/routes/vegetal.js` (authz), `server/prisma/` (migrations) e novo `.env.example`.

**Comportamento esperado:** Mudanças são de backend/infra; o usuário final não percebe diferença, exceto bloqueio ao exceder o limite de login.

**Estados da UI:**
- Estado vazio: não aplicável (spec de backend/operação).
- Estado de carregamento: não aplicável.
- Estado de erro: cliente exibe "muitas tentativas, tente novamente em instantes" ao receber 429.
- Estado de sucesso: operação normal sem alteração visível.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:** Nenhuma entidade de negócio nova. A mudança estrutural é processual: passar a versionar o schema com migrations do Prisma.

**Migrações necessárias:** Sim — criar a migration inicial a partir do schema atual e adotar o fluxo de migrations para mudanças seguintes.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| express-rate-limit (ou equivalente) | Obrigatória | Sem ele o login fica sem proteção de brute force |
| Biblioteca de validação (ex.: zod) | Obrigatória | Sem ela a validação de entrada fica manual e incompleta |
| Logger estruturado (ex.: pino) | Obrigatória | Sem ele a observabilidade permanece em 1/5 |
| Prisma Migrate | Obrigatória | Sem migrations o schema fica sem histórico |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Deploy sem JWT_SECRET em produção | Variável ausente | Processo encerra com erro claro antes de aceitar requisições |
| EC-02: Excesso de tentativas de login | Mais de 10 por IP em 15 min | Retorna 429 e registra a ocorrência no log |
| EC-03: Origem não permitida no CORS | Requisição de origem fora da allowlist | Navegador bloqueia; servidor não responde dados |
| EC-04: Payload inválido em mutação | Tipo ou campo fora do schema | Retorna 400 com detalhe do campo, sem 500 |
| EC-05: Falha ao aplicar migration | Migration incompatível com dados | Aborta o deploy e mantém o schema anterior (rollback) |
| EC-06: Erro interno não tratado | Exceção inesperada | Retorna 500 genérico ao cliente e log estruturado completo no servidor |

---

## 12. Segurança e Privacidade

- **Autenticação:** Reforça a base da spec de Autenticação e Autorização (segredo forte obrigatório).
- **Autorização:** Inclui a correção do gap do estoque de vegetal.
- **Dados sensíveis:** Logs não devem conter senha, hash nem token; mascarar campos sensíveis.
- **Auditoria:** Registrar logins falhos, bloqueios por rate limit e mudanças de papel.

---

## 13. Plano de Rollout

- **Estratégia:** Quick wins primeiro (segredo obrigatório, rate limit, CORS allowlist, authz do estoque, .env.example), depois validação, logger e migrations.
- **Como reverter (rollback):** Cada item é independente e reversível por commit; migrations têm rollback próprio.
- **Monitoramento pós-deploy:** Observar taxa de 429, erros 400/500, e volume de logs estruturados nas primeiras 48h.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | Quais origens entram na allowlist de CORS (web própria, domínios institucionais)? | Alto | Daniel | 15 dias |
| OQ-02 | Qual host de produção será usado (Railway, Render, VPS) e quando migrar para PostgreSQL? | Médio | Daniel | 45 dias |
| OQ-03 | Adotaremos zod para validação ou validação manual padronizada? | Médio | Daniel | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Segredo obrigatório com aborto no boot | Manter fallback de desenvolvimento | Elimina o risco de subir com segredo público |
| Rate limit por IP no login | Sem proteção / captcha | Baixo custo e eficácia imediata contra brute force |
| Migrations versionadas | Continuar com db push | Histórico e rollback seguros em produção |
| Logger estruturado | Manter console.error | Observabilidade mínima para diagnóstico em produção |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md` (seções B, C e E)
- Specs relacionadas: Autenticação e Autorização, Estoque de Vegetal

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-10 | Daniel | Criação inicial (checklist de hardening pré-produção) |

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
