# Spec: Estatísticas de Participação nas Sessões + Controle Granular de Permissões

**Versão:** 1.1
**Status:** Aprovada
**Autor:** Fernando (via Claude)
**Data:** 2026-06-14
**Reviewers:** N/A

---

## 1. Resumo

Esta feature transforma os papéis exercidos nas sessões (direção, explanação, leitura, assistência e som) de texto livre em vínculos com o cadastro de Associados, e a partir desses vínculos calcula estatísticas de participação por pessoa (quem mais exerceu cada função, quem nunca exerceu, e quem está há mais tempo sem exercer). Em paralelo, introduz um controle granular de permissões (matriz papel→capacidades, com exceções por usuário) que governa quem pode ver estatísticas, relatórios e dados sensíveis.

---

## 2. Contexto e Motivação

**Problema:**
Hoje os papéis da sessão (`dirigente`, `assistente`, `auxAssistente`, `som`, `leituraDocumentos`, `explanacao`) são gravados como texto livre na entidade `SessionRecord`, sem ligação com o cadastro de `Associado`. Isso impede qualquer apuração confiável por pessoa: não há como saber quantas vezes alguém dirigiu, quem nunca fez a leitura, ou quem está há mais tempo sem assistir. Além disso, não existe controle de acesso fino: a autorização atual é binária por papel de projeto (`req.isElevated` = GESTOR/ADMIN), e o grau institucional (QM) sequer é conhecido pelo sistema, porque o `User` que faz login não está ligado ao `Associado`.

**Evidências:**
A direção da casa precisa distribuir funções com justiça e acompanhar quem está ocioso ou sobrecarregado. Esse acompanhamento é feito hoje manualmente, relendo o histórico de sessões. O cadastro de Associados (com grau CDC, CI, QM, QS) já existe e está populado por importação, servindo de base pronta para o vínculo.

**Por que agora:**
O cadastro de Associados e o Controle de Sessões já estão implementados e em uso. O vínculo entre eles é o próximo passo natural e desbloqueia tanto as estatísticas quanto a noção de "usuário QM", pré-requisito do controle de permissões pedido pela direção.

---

## 3. Goals (Objetivos)

- [ ] G-01: Vincular papéis das sessões a Associados, de modo que 100% das novas sessões registrem participação estruturada (não texto livre).
- [ ] G-02: Calcular e exibir, por função, o ranking de quem mais exerceu, a lista de quem nunca exerceu e a ordenação por quem está há mais tempo sem exercer.
- [ ] G-03: Exibir as estatísticas no painel por função, na ficha do associado, no resumo da tela de Sessões e em relatório exportável.
- [ ] G-04: Restringir estatísticas, relatórios e dados sensíveis por um controle granular de permissões (matriz papel→capacidade + exceções por usuário), aplicado no servidor.
- [ ] G-05: Aproveitar o histórico existente, casando por nome os papéis de texto livre das sessões antigas, com revisão manual dos não-casados.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Novas sessões com papéis vinculados a Associado | 0% | 100% | no lançamento |
| Funções com estatística disponível (direção, explanação, leitura, assistência, som) | 0 | 5 | no lançamento |
| Sessões históricas casadas automaticamente por nome | 0% | ≥ 70% | migração inicial |
| Tempo de resposta P95 das consultas de estatística | N/A | < 500ms | contínuo |
| Vazamento de estatística para usuário sem capacidade | N/A | 0 ocorrências | contínuo |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá criação automática de Associado a partir de nome de sessão; nomes históricos não casados ficam pendentes de vínculo manual, sem entrar no cadastro.
- NG-02: Não haverá editor visual de dashboards/gráficos customizáveis; os painéis têm layout fixo definido nesta spec.
- NG-03: Não será portado nada da feature para a tela NATIVA nesta versão (somente web), seguindo o padrão atual do projeto.
- NG-04: Não haverá integração com sistemas externos de outros núcleos para importar participação; pessoas de outro núcleo continuam como snapshot manual onde já previsto.
- NG-05: Não haverá versionamento/auditoria histórica da matriz de permissões além de um log simples de alteração; um histórico navegável fica para versão futura.

---

## 5. Usuários e Personas

**Usuário primário:** Gestor/Admin da casa (papel elevado no projeto) que registra sessões, consulta os painéis e configura permissões; nível técnico médio, usa o preview web.

**Usuário secundário:** Mestre de grau QM (vinculado a um Associado) que consulta estatísticas liberadas ao seu grau, sem poder de configuração.

**Usuário terciário:** Membro comum, que registra sessões quando autorizado, sem acesso às estatísticas restritas.

**Jornada atual (sem a feature):**
1. O usuário abre o histórico de sessões e lê manualmente os nomes em texto livre.
2. Conta de cabeça quantas vezes cada pessoa exerceu cada função.
3. Não consegue saber com segurança quem nunca exerceu nem quem está há mais tempo parado.

**Jornada futura (com a feature):**
1. O usuário registra a sessão escolhendo cada papel a partir do autocomplete de Associados.
2. O sistema grava a participação estruturada e atualiza as estatísticas.
3. O usuário abre o painel por função e vê ranking, nunca-exerceram e há-mais-tempo-sem-exercer.
4. Usuários sem capacidade não enxergam os blocos restritos.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve permitir vincular cada conta de login (`User`) a no máximo um `Associado`, e cada `Associado` a no máximo um `User`. | Must | Tela de gestão de acessos permite definir/limpar o vínculo; tentar vincular o mesmo Associado a dois usuários retorna erro 409. |
| RF-02 | O sistema deve derivar o grau institucional do usuário logado a partir do Associado vinculado. | Must | Usuário vinculado a Associado grau QM passa a contar como papel efetivo "QM"; usuário sem vínculo não recebe papel de grau. |
| RF-03 | O usuário deve poder, ao registrar/editar uma sessão, escolher para cada função (direção, explanação, leitura, som, assistente) exatamente um Associado, e para auxiliares do assistente um ou mais Associados, via autocomplete. | Must | Cada campo de função guarda o id do Associado escolhido; auxiliares aceitam vários; é possível também digitar nome manual de outro núcleo (snapshot), sem cadastrar. |
| RF-04 | O sistema deve permitir marcar, somente em sessões do tipo ESCALA ou EXTRA, que houve Transmissão da Assistência, registrando o Mestre que entrega e o Mestre que pega a assistência. | Must | Marcador "Transmissão da Assistência" só aparece/aceita em ESCALA e EXTRA; quando marcado, exibe os campos Mestre-entrega e Mestre-pega; salvar em outro tipo retorna erro. |
| RF-05 | O sistema deve registrar, de forma estruturada, uma linha de participação por (sessão, pessoa, função) sempre que uma sessão for salva. | Must | Após salvar uma sessão com direção e leitura preenchidas, existem linhas de participação `DIRECAO` e `LEITURA` ligadas àquela sessão e data. |
| RF-06 | O sistema deve permitir configurar, por função, quais graus são elegíveis a exercê-la (população de referência). | Must | Admin define que `DIRECAO` é elegível só a QM; a configuração é persistida e usada nas estatísticas. |
| RF-07 | O sistema deve calcular, por função e dentro da população elegível, o ranking de quem mais exerceu (contagem decrescente). | Must | Painel da função mostra a lista ordenada por contagem; o total bate com as linhas de participação daquela função. |
| RF-08 | O sistema deve listar, por função, os elegíveis que nunca a exerceram. | Must | Painel mostra "Nunca exerceram" contendo todos os elegíveis com contagem zero naquela função. |
| RF-09 | O sistema deve ordenar, por função, os elegíveis que já exerceram pela data da última vez (mais antigo primeiro = há mais tempo sem exercer). | Must | Painel mostra "Há mais tempo sem exercer" ordenado pela última data ascendente; a data exibida coincide com a participação mais recente da pessoa. |
| RF-10 | O sistema deve exibir, na ficha de cada Associado, as funções que exerceu, a contagem por função e a data da última vez de cada uma. | Must | Abrir um Associado mostra, por função, contagem e última data; bate com as participações daquela pessoa. |
| RF-11 | O sistema deve oferecer um relatório exportável das estatísticas em CSV e em PDF. | Should | Botão de exportar gera CSV (abre em planilha) e PDF (pronto para impressão), ambos com função, pessoa, grau, contagem e última data. |
| RF-12 | O sistema deve exibir um bloco-resumo de estatísticas na tela de Sessões somente para usuários com a capacidade de visualizá-las. | Must | Usuário com capacidade vê o resumo; usuário sem capacidade não recebe o bloco nem os dados na resposta da API. |
| RF-13 | O sistema deve resolver as capacidades do usuário pela união das capacidades de seus papéis efetivos (papel de projeto + grau) e aplicar exceções por usuário, com negação tendo precedência. | Must | Conceder VER_ESTATISTICAS ao papel QM libera para QMs; um DENY por usuário remove a capacidade mesmo que o papel conceda. |
| RF-14 | O sistema deve permitir que um administrador edite a matriz papel→capacidade e as exceções por usuário. | Must | Tela de permissões lista papéis e capacidades; alterações entram em vigor na requisição seguinte do usuário afetado. |
| RF-15 | O sistema deve negar no servidor (não apenas ocultar na UI) qualquer leitura de estatística, relatório ou dado sensível a quem não tem a capacidade correspondente. | Must | Chamada direta à API de estatística sem a capacidade retorna 403, mesmo com a UI contornada. |
| RF-16 | O sistema deve executar uma migração única que cria linhas de participação a partir do texto livre das sessões existentes, casando nomes a Associados e marcando os não-casados como pendentes. | Should | Após a migração, ≥ 70% das ocorrências históricas ficam vinculadas; os não-casados aparecem numa lista de revisão para vínculo manual. |
| RF-17 | O usuário com permissão deve poder resolver manualmente um nome histórico não casado, vinculando-o a um Associado ou marcando-o como ignorado. | Should | Resolver um pendente cria/atualiza as participações correspondentes; ignorar remove o item da fila sem criar participação. |
| RF-18 | O sistema deve permitir filtrar as estatísticas por período (todo o período, ano atual e anos anteriores), reaproveitando o filtro já existente na tela de Sessões. | Could | Selecionar um ano recalcula ranking, nunca-exerceram e há-mais-tempo considerando apenas o período. |
| RF-19 | O sistema deve permitir marcar uma sessão como "Dirigida por autoridade" (autoridade de grau superior dirigindo), de forma independente do marcador de Transmissão da Assistência. | Should | Marcar o campo identifica a sessão como dirigida por autoridade; é possível filtrar/listar essas sessões; o marcador convive com Transmissão da Assistência. |
| RF-20 | O sistema deve tratar Transmissão-entrega e Transmissão-pega como funções próprias (de QM) nas estatísticas, distintas de "direção", alimentadas pelo marcador de Transmissão da Assistência. | Must | Ao marcar Transmissão e informar os dois Mestres, geram-se participações `TRANSMISSAO_ENTREGA` e `TRANSMISSAO_PEGA`; elas não somam no contador de "direção". |

> Prioridades: **Must** (obrigatório no MVP) / **Should** (importante, negociável) / **Could** (desejável, opcional)

### 6.2 Fluxo Principal (Happy Path)

1. O administrador vincula, na gestão de acessos, sua conta e a dos demais usuários aos respectivos Associados.
2. O administrador configura os graus elegíveis por função (ex.: direção → QM; leitura → CI, QM, QS).
3. O usuário registra uma nova sessão e escolhe, via autocomplete, o Associado de cada função.
4. O sistema salva a sessão e grava uma linha de participação por (sessão, pessoa, função).
5. O usuário abre o painel da função "Direção".
6. O sistema verifica a capacidade VER_ESTATISTICAS, calcula e retorna ranking, nunca-exerceram e há-mais-tempo-sem-exercer.
7. Resultado: o usuário enxerga a distribuição da função e identifica quem acionar a seguir.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Transmissão da Assistência:**
1. O usuário registra uma sessão do tipo ESCALA ou EXTRA.
2. O usuário marca "Transmissão da Assistência" e informa o Mestre-entrega e o Mestre-pega.
3. O sistema grava participações de transmissão (entrega e pega) além da direção comum, se houver.

**Fluxo Alternativo B — Autoridade dirige a transmissão:**
1. Em uma sessão de transmissão, quem dirige é uma autoridade de grau superior, fora da população elegível normal.
2. O usuário preenche o dirigente com a autoridade e ainda assim marca "Transmissão da Assistência" e os Mestres entrega/pega.
3. O sistema conta direção para a autoridade e transmissão (entrega/pega) para os Mestres, sem rejeitar por elegibilidade.

**Fluxo Alternativo C — Pessoa de outro núcleo:**
1. O usuário não encontra a pessoa no autocomplete.
2. O usuário informa nome, grau e núcleo manualmente (snapshot), como já previsto no estoque.
3. O sistema registra a participação com nome textual, sem vínculo a Associado, fora dos rankings por pessoa.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance das consultas de estatística | P95 < 500ms | dataset de centenas de sessões; usar tabela de participação indexada por função/data |
| RNF-02 | Overhead da checagem de permissão por request | < 50ms | resolver capacidades com cache da matriz em memória, invalidado ao salvar |
| RNF-03 | Segurança de autorização | 100% no servidor | toda leitura restrita validada por capacidade na API, não só na UI |
| RNF-04 | Privacidade de dados sensíveis | CPF e contato sob capacidade | dados sensíveis do Associado só retornam a quem tem capacidade própria |
| RNF-05 | Idempotência da migração de histórico | reexecução segura | rodar a migração duas vezes não duplica participações |

---

## 8. Design e Interface

**Componentes afetados:** tela de Controle de Sessões (formulário e resumo), tela de Associados (ficha individual e nova tela de painéis por função), tela de gestão de acessos (vínculo User↔Associado e matriz de permissões), endpoints novos de participação, estatística, permissões e migração.

**Comportamento esperado:**
No formulário de sessão, cada função vira um seletor de Associado com autocomplete (mesmo componente do estoque), exibindo o grau nas sugestões; auxiliares aceitam vários. Um marcador "Transmissão da Assistência" aparece apenas em ESCALA/EXTRA e revela os campos Mestre-entrega e Mestre-pega. O painel por função apresenta três blocos: ranking, nunca-exerceram e há-mais-tempo-sem-exercer, com filtro de período. A ficha do Associado ganha uma seção de participação. A tela de permissões mostra a matriz papel×capacidade com toggles e uma lista de exceções por usuário.

**Estados da UI:**
- Estado vazio: quando não há participação registrada, os painéis mostram "Sem dados de participação ainda".
- Estado de carregamento: indicador discreto enquanto as estatísticas são calculadas.
- Estado de erro: falha de cálculo mostra mensagem clara com opção de tentar novamente.
- Estado sem permissão: blocos restritos não são renderizados e a API não retorna os dados.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
User (modificado) {
  associadoId: String? @unique   // vínculo com o cadastro de Associado (grau vem de lá)
}

SessionRecord (modificado) {
  dirigenteId: String?           // Associado da direção
  assistenteId: String?          // Associado do assistente
  somId: String?                 // Associado do som
  leituraId: String?             // Associado da leitura
  explanacaoId: String?          // Associado da explanação
  transmissaoAssistencia: Boolean @default(false)  // só ESCALA/EXTRA
  mestreEntregaId: String?       // Mestre que entrega a assistência (QM)
  mestrePegaId: String?          // Mestre que pega a assistência (QM)
  dirigidaPorAutoridade: Boolean @default(false)   // autoridade de grau superior dirigindo (RF-19)
  // campos de texto livre antigos permanecem para histórico/fallback
}

SessionParticipation (nova) {
  id: String
  sessionId: String              // sessão de origem (cascade ao excluir)
  associadoId: String?           // pessoa da base; nulo se nome de outro núcleo
  nomeTexto: String?             // nome textual quando sem vínculo
  funcao: String                 // DIRECAO | EXPLANACAO | LEITURA | ASSISTENTE | AUX_ASSISTENTE | SOM | TRANSMISSAO_ENTREGA | TRANSMISSAO_PEGA
  data: DateTime                 // denormalizado da sessão para consulta rápida
  // índices por (funcao, data) e (associadoId, funcao)
}

FuncaoElegibilidade (nova) {
  funcao: String @id             // função
  graus: String                  // lista de graus elegíveis (ex.: "QM,CDC,CI")
}
// Seed inicial (resolução OQ-02):
//   DIRECAO              -> QM, CDC, CI
//   EXPLANACAO           -> CDC, CI, QM, QS
//   LEITURA              -> CDC, CI, QM, QS
//   ASSISTENTE           -> QM
//   AUX_ASSISTENTE       -> CDC, CI, QM, QS
//   SOM                  -> CDC, CI, QM, QS
//   TRANSMISSAO_ENTREGA  -> QM
//   TRANSMISSAO_PEGA     -> QM

Capability (conceitual / enum) {
  VER_ESTATISTICAS | VER_RELATORIOS | EXPORTAR_RELATORIOS |
  EDITAR_SESSOES | GERIR_PERMISSOES | VER_DADOS_SENSIVEIS_ASSOCIADO |
  GERIR_ASSOCIADOS | GERIR_ESTOQUE | VER_AGENDA_INSTITUCIONAL
}

RoleCapability (nova) {
  role: String                   // GESTOR | ADMIN | QM | QS | CI | CDC | MEMBRO | VISITANTE
  capability: String
  // unique(role, capability)
}

UserCapabilityOverride (nova) {
  userId: String
  capability: String
  effect: String                 // ALLOW | DENY (DENY tem precedência)
  // unique(userId, capability)
}

PendingNameMatch (nova) {
  id: String
  nomeTexto: String              // nome livre não casado
  funcao: String
  sessionId: String
  status: String                 // PENDENTE | RESOLVIDO | IGNORADO
}
```

**Migrações necessárias:** Sim. Criação das tabelas novas, alteração de `User` e `SessionRecord`, seed inicial da matriz `RoleCapability` (padrão: GESTOR/ADMIN com todas; QM com VER_ESTATISTICAS/VER_RELATORIOS) e de `FuncaoElegibilidade`. Migração de dados única (RF-16) para gerar `SessionParticipation` a partir do texto livre, idempotente (RNF-05).

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Cadastro de Associados (entidade existente) | Obrigatória | Sem ela não há vínculo nem população elegível; é pré-requisito já atendido |
| Identidade central (Membership.role) | Obrigatória | Sem ela não há papel de projeto; já existe e em uso |
| Prisma + SQLite (banco do projeto) | Obrigatória | Sem o banco a feature não persiste; usar transações ao gerar participação |
| Componente de autocomplete de Associado (já existente no estoque) | Opcional | Se reaproveitado, reduz retrabalho; fallback é um seletor simples |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Nome histórico sem correspondência | Migração não acha Associado para um nome livre | Cria participação com `nomeTexto` e item em `PendingNameMatch`; fica fora dos rankings por pessoa até resolução |
| EC-02: Usuário sem Associado vinculado | Login de conta de sistema (ex.: seed) sem vínculo | Não recebe papel de grau; capacidades vêm só do papel de projeto; nenhuma falha |
| EC-03: Transmissão marcada em tipo inválido | Marcar transmissão em sessão que não é ESCALA/EXTRA | API rejeita com erro de validação e mensagem clara; UI não oferece o marcador nesses tipos |
| EC-04: Transmissão sem os dois Mestres | Marcar transmissão e deixar entrega ou pega em branco | Aviso de campo obrigatório; salvar fica bloqueado até preencher ambos ou desmarcar |
| EC-05: Associado vinculado a dois usuários | Tentar vincular Associado já ligado a outra conta | Retorna 409 e não altera o vínculo existente |
| EC-06: Associado inativado após participar | Pessoa sai da ativa depois de exercer funções | Sai da população elegível futura; contagens históricas permanecem; aparece marcada como inativa nos painéis |
| EC-07: Falha/timeout ao calcular estatística | Banco lento ou erro de consulta | API responde erro 500 controlado; UI mostra estado de erro com opção de tentar novamente; sem dado parcial enganoso |
| EC-08: Acesso direto à API sem capacidade | Usuário sem VER_ESTATISTICAS chama o endpoint | Retorna 403 e não inclui dado algum no corpo |
| EC-09: Pessoa exerce mais de uma função na mesma sessão | Mesmo Associado em direção e leitura | Gera duas participações distintas; conta em cada função independentemente |
| EC-10: Reexecução da migração | Migração rodada novamente | Não duplica participações já geradas (chave determinística por sessão+função+pessoa) |
| EC-11: Matriz de permissões alterada durante a sessão do usuário | Admin remove capacidade enquanto o usuário usa o app | A próxima requisição do usuário já reflete a remoção (sem esperar novo login) |
| EC-12: Função sem graus elegíveis configurados | `FuncaoElegibilidade` vazia para uma função | População de referência cai para todos os associados ativos, com aviso de configuração pendente |

---

## 12. Segurança e Privacidade

- **Autenticação:** Toda a feature exige usuário autenticado (middleware atual de JWT).
- **Autorização:** Leitura de estatística exige VER_ESTATISTICAS; relatórios, VER_RELATORIOS; exportação, EXPORTAR_RELATORIOS; edição da matriz, GERIR_PERMISSOES; dados sensíveis do associado, VER_DADOS_SENSIVEIS_ASSOCIADO. Resolução por união de papéis efetivos (papel de projeto + grau via vínculo) com exceções por usuário, negação com precedência.
- **Dados sensíveis:** CPF e contatos do Associado são PII; só retornam a quem tem a capacidade própria; o CPF segue exibido mascarado por padrão. Estatística de participação é dado institucional sensível, restrito conforme acima.
- **Auditoria:** Registrar log simples de quem alterou a matriz de permissões e os vínculos User↔Associado (quem, quando, o quê), suficiente para rastreio sem histórico navegável nesta versão.

---

## 13. Plano de Rollout

- **Estratégia:** Rollout incremental em três fatias atrás de um indicador de disponibilidade: (1) vínculo User↔Associado e papéis estruturados na sessão; (2) tabela de participação, migração do histórico e painéis/estatística; (3) matriz de permissões e gating. Cada fatia é entregável e validável isoladamente.
- **Como reverter (rollback):** Como os campos de texto livre da sessão são preservados, reverter a UI para o formato textual não perde histórico; as tabelas novas podem ser desativadas sem afetar o registro de sessões. A matriz de permissões tem um padrão seguro (apenas GESTOR/ADMIN com tudo) que pode ser restaurado pelo seed.
- **Monitoramento pós-deploy:** Observar nas primeiras 48h o tempo de resposta das consultas de estatística, a taxa de casamento da migração, erros 403 inesperados e divergências entre contagem exibida e linhas de participação.

---

## 14. Open Questions

Todas as Open Questions foram resolvidas em 2026-06-14 (ver Decision Log). Nenhuma pendência bloqueia a implementação.

| # | Pergunta | Status | Resolução |
|---|---------|--------|-----------|
| OQ-01 | Transmissão conta como "direção" ou é categoria separada? | ✅ Resolvida | Categoria própria (função de QM), marcada por checkbox; não soma em "direção" (RF-20) |
| OQ-02 | Graus elegíveis por função no seed | ✅ Resolvida | Direção→QM/CDC/CI; Explanação/Leitura/Aux/Som→CDC/CI/QM/QS; Assistente e Transmissão→QM |
| OQ-03 | Capacidades faltantes | ✅ Resolvida | Adicionadas GERIR_ASSOCIADOS, GERIR_ESTOQUE, VER_AGENDA_INSTITUCIONAL |
| OQ-04 | Marcador próprio para autoridade dirigindo | ✅ Resolvida | Sim — campo `dirigidaPorAutoridade` (RF-19) |
| OQ-05 | Formato de export além de CSV | ✅ Resolvida | CSV + PDF (RF-11) |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Vincular User↔Associado para derivar grau | Marcar grau direto no acesso; restringir só a ADMIN/GESTOR | Reaproveita o cadastro existente e evita duplicar o grau em dois lugares |
| Tabela `SessionParticipation` derivada | Calcular estatística lendo os campos da sessão a cada consulta | Consulta indexada por função/data é rápida e simplifica rankings e ficha do associado |
| Casar histórico por nome com fila de pendências | Ignorar histórico; só novas sessões | A direção quer aproveitar o histórico; o casamento por nome com revisão equilibra esforço e cobertura |
| Permissões: matriz papel→capacidade + exceções por usuário | Apenas papéis fixos; cargos totalmente customizáveis | Atende ao pedido de granularidade sem o custo de um motor de cargos livres nesta versão |
| Elegibilidade por função baseada em grau | Comparar todos os associados ativos | Torna "nunca exerceu" e "há mais tempo sem exercer" significativos, comparando só quem pode exercer |
| População de outro núcleo como snapshot textual | Cadastrar a pessoa | Decisão já vigente no estoque; mantém o cadastro limpo e a estatística por pessoa íntegra |
| Transmissão como função própria de QM (checkbox) | Contar como "direção" | É uma função específica do QM; mantê-la separada preserva a leitura correta das estatísticas (OQ-01) |
| Marcador próprio "Dirigida por autoridade" | Reutilizar só o flag de transmissão | Permite identificar/filtrar sessões dirigidas por autoridade sem distorcer a estatística de direção (OQ-04) |
| Elegibilidade: Direção inclui CDC e CI além de QM | Direção só QM | Reflete a regra real informada pela direção (OQ-02) |
| Capacidades incluem gerir associados/estoque e ver agenda institucional | Conjunto mínimo | Cobre as áreas sensíveis já existentes no app sob o mesmo controle granular (OQ-03) |
| Export em CSV e PDF | Só CSV | PDF atende impressão/arquivo físico pedido pela direção (OQ-05) |

---

## Apêndice

### Referências
- Arquitetura de identidade central: docs/arquitetura-identidade-central.md
- Entidades existentes relevantes: SessionRecord, Associado, Membership, User (server/prisma/schema.prisma)
- Componente de autocomplete de Associado: app/app/(tabs)/sessions.web.tsx (AssociadoPicker)

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-14 | Fernando (via Claude) | Criação inicial a partir da entrevista SDD |
| 1.1 | 2026-06-14 | Fernando (via Claude) | Resolução das Open Questions OQ-01..05; status Aprovada |

### Relatório de Avaliação (spec_scorer)
**Score total: 100.0/100 — ⭐ Excelente — Pronta para implementação** (2026-06-14)

| Dimensão | Score | Peso | Contribuição |
|----------|-------|------|--------------|
| Completude | 100% | 30% | 30.0 |
| Testabilidade | 100% | 25% | 25.0 |
| Clareza | 100% | 20% | 20.0 |
| Escopo | 100% | 15% | 15.0 |
| Edge Cases | 100% | 10% | 10.0 |

Sem gaps críticos nem sugestões pendentes. Open Questions OQ-01..OQ-05 todas resolvidas (v1.1). Spec aprovada e pronta para implementação pela Fatia 1.
