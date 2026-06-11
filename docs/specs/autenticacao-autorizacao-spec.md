# Spec: Autenticação e Autorização

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define o cadastro, login e o controle de acesso da Agenda Institucional. Estabelece autenticação via JWT, senhas protegidas com bcrypt e autorização por papel global (ADMIN/GESTOR/MEMBRO/VISITANTE) combinada com papel por agenda (OWNER/EDITOR/VIEWER).

---

## 2. Contexto e Motivação

**Problema:** O sistema guarda dados pessoais e institucionais sensíveis (membros, sessões, estoque). Sem um contrato explícito de quem pode ler e escrever cada recurso, a regra de acesso fica espalhada pelo código e abre brechas — um exemplo real é o módulo de estoque, hoje sem checagem de papel.

**Evidências:** A função `requireCalendar` em `server/src/lib/auth.js` já centraliza a autorização de escrita, porém nem todos os routers a invocam. A avaliação arquitetural pontuou Segurança em 2/5.

**Por que agora:** Antes de publicar a API em rede pública, o modelo de acesso precisa estar documentado e uniforme entre todos os módulos.

---

## 3. Goals

- [ ] G-01: Todo endpoint protegido exige um JWT válido antes de qualquer operação.
- [ ] G-02: Toda escrita em agenda passa por verificação de papel OWNER/EDITOR (ou ADMIN global).
- [ ] G-03: Senhas nunca são armazenadas nem retornadas em texto puro.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Endpoints sem authz indevida | 1 (vegetal) | 0 | 30 dias |
| Latência de verificação de token P95 | ~50ms | < 80ms | contínuo |
| Hash de senha (custo bcrypt) | 10 | 10 | contínuo |

---

## 4. Non-Goals

- NG-01: Não implementa OAuth social (Google/Apple) nesta versão — apenas e-mail e senha.
- NG-02: Não implementa refresh tokens nem revogação ativa; o token expira em 30 dias.
- NG-03: Não implementa verificação de e-mail por link nem recuperação de senha self-service nesta versão.

---

## 5. Usuários e Personas

**Usuário primário:** Membro da instituição com conta de e-mail e senha, nível técnico básico, acessa pelo app Web ou celular.
**Usuário secundário:** Administrador (primeiro usuário cadastrado) que gerencia papéis e agendas.

**Jornada atual (sem a feature):** O acesso depende de regras implícitas no código; um módulo novo pode esquecer a checagem e expor dados.

**Jornada futura (com a feature):** O usuário faz login uma vez, recebe um token, e cada requisição é validada por um contrato único de autenticação e autorização aplicado a todos os módulos.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder se cadastrar com nome, e-mail e senha de no mínimo 6 caracteres | Must | POST /api/auth/register com senha de 5 caracteres retorna 400; com 6+ cria a conta |
| RF-02 | O sistema deve tornar ADMIN o primeiro usuário cadastrado e MEMBRO os demais | Must | Primeiro register cria role=ADMIN; segundo cria role=MEMBRO |
| RF-03 | O sistema deve recusar cadastro com e-mail já existente | Must | Register com e-mail duplicado retorna 409 |
| RF-04 | O usuário deve poder autenticar com e-mail e senha e receber um JWT válido por 30 dias | Must | POST /api/auth/login com credenciais corretas retorna token; incorretas retornam 401 |
| RF-05 | O sistema deve rejeitar qualquer requisição protegida sem token válido | Must | Requisição sem header Authorization retorna 401 |
| RF-06 | O sistema deve bloquear login e requisições de usuário inativo (active=false) | Must | Usuário desativado recebe 403 no login e 401 no middleware |
| RF-07 | O sistema deve exigir papel OWNER ou EDITOR (ou ADMIN global) para escrever numa agenda | Must | EDITOR consegue PUT; VIEWER recebe 403 |
| RF-08 | O sistema nunca deve retornar o campo de hash de senha em nenhuma resposta | Must | Respostas de auth contêm apenas id, name, email, role |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário envia POST /api/auth/login com e-mail e senha.
2. O sistema busca o usuário pelo e-mail e compara a senha com o hash via bcrypt.
3. O sistema confirma que o usuário está ativo.
4. O sistema assina um JWT contendo o id e o papel do usuário.
5. Resultado: o cliente recebe o token e os dados públicos do usuário, e o usa no header Authorization das próximas requisições.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Primeiro cadastro do sistema:**
1. Nenhum usuário existe ainda no banco.
2. O register cria o usuário com role=ADMIN e cria uma agenda pessoal padrão com o usuário como OWNER.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | Verificação de token P95 < 80ms | Inclui 1 consulta ao banco |
| RNF-02 | Segurança | JWT_SECRET obrigatório via variável de ambiente | A API deve recusar subir sem o segredo em produção |
| RNF-03 | Segurança | Hash bcrypt com custo 10 | Sem armazenamento de senha em texto puro |
| RNF-04 | Disponibilidade | Middleware de auth sem estado | Escala horizontalmente sem sessão em memória |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/auth.js`, `server/src/lib/auth.js`, tela `app/app/login.tsx` e cliente `app/src/api.ts`.

**Comportamento esperado:** O usuário vê um formulário de login; ao autenticar, o token é guardado em AsyncStorage e enviado automaticamente. Sessão expirada redireciona para o login.

**Estados da UI:**
- Estado vazio: formulário de e-mail e senha sem mensagens.
- Estado de carregamento: botão desabilitado enquanto a requisição corre.
- Estado de erro: mensagem "E-mail ou senha incorretos" sem revelar qual campo falhou.
- Estado de sucesso: navegação para a tela inicial autenticada.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
User {
  id: String (cuid, PK)
  name: String
  email: String (único)
  passwordHash: String      // bcrypt, nunca exposto
  role: String              // ADMIN | GESTOR | MEMBRO | VISITANTE
  active: Boolean           // false bloqueia acesso
  createdAt: DateTime
}

CalendarMember {
  calendarId + userId (único)
  role: String              // OWNER | EDITOR | VIEWER
}
```

**Migrações necessárias:** Não para os campos atuais; ver spec de Segurança e Operação para versionamento via migrations.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| bcryptjs | Obrigatória | Sem hash de senha o cadastro/login falha |
| jsonwebtoken | Obrigatória | Sem assinatura/validação de token todo acesso protegido falha |
| Prisma + banco | Obrigatória | Indisponibilidade do banco retorna 500 no login |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Token expirado ou adulterado | JWT inválido no header | Retorna 401 "Token inválido ou expirado" |
| EC-02: Usuário desativado após emitir token | active vira false | Middleware retorna 401 na próxima requisição |
| EC-03: Falha do banco durante login | Banco indisponível ou timeout | Retorna 500 sem vazar detalhes; erro registrado no log |
| EC-04: E-mail duplicado no cadastro | E-mail já existe | Retorna 409 sem revelar dados do usuário existente |
| EC-05: Senha abaixo do mínimo | Senha com menos de 6 caracteres | Retorna 400 com mensagem clara |

---

## 12. Segurança e Privacidade

- **Autenticação:** JWT assinado com HS256; expira em 30 dias.
- **Autorização:** Papel global no token + papel por agenda em CalendarMember; ADMIN ignora a checagem por agenda.
- **Dados sensíveis:** Senha (PII) protegida com bcrypt; hash nunca retornado.
- **Auditoria:** Registrar tentativas de login falhas e mudanças de papel (ver spec de Segurança e Operação).

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; o ajuste pendente (JWT_SECRET obrigatório, uniformizar guards) entra como rollout gradual por módulo.
- **Como reverter (rollback):** Reverter o commit do guard; tokens existentes continuam válidos.
- **Monitoramento pós-deploy:** Observar taxa de 401/403 e erros 500 no login nas primeiras 48h.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | O papel GESTOR terá permissões distintas de MEMBRO? Hoje são equivalentes fora do escopo ADMIN | Médio | Daniel | 30 dias |
| OQ-02 | Adotaremos refresh token ou manteremos expiração única de 30 dias? | Médio | Daniel | 60 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| JWT stateless de 30 dias | Sessão em banco/Redis | Simplicidade e escala sem infraestrutura extra |
| Primeiro usuário vira ADMIN | Seed manual de admin | Bootstrap sem passo extra de configuração |
| Papel duplo (global + por agenda) | Apenas papel global | Permite compartilhamento granular por agenda |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/lib/auth.js` e `server/src/routes/auth.js`

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
