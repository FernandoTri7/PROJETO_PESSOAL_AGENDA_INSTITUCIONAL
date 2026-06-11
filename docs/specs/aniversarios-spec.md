# Spec: Aniversários e Classificação Etária

**Versão:** 1.0
**Status:** Implementada (documentação retroativa)
**Autor:** Daniel
**Data:** 2026-06-10
**Reviewers:** N/A

---

## 1. Resumo

Define o registro de aniversários por agenda e a classificação etária automática dos aniversariantes em três faixas: Crianças (0–11), Jovens (12–17) e Adultos (18+). A faixa é calculada na API a partir da data de nascimento, não persistida.

---

## 2. Contexto e Motivação

**Problema:** A instituição acompanha aniversários e precisa agrupar pessoas por faixa etária para ações específicas (homenagens infantis, juvenis, adultas), sem recalcular idade manualmente.

**Evidências:** O módulo `birthdays.js` já calcula a faixa etária na resposta e aceita filtro por grupo.

**Por que agora:** Formalizar a regra de faixa etária evita divergência entre app e API e fixa os limites de cada grupo.

---

## 3. Goals

- [ ] G-01: O usuário registra aniversariantes e os vê agrupados por faixa etária sem cálculo manual.
- [ ] G-02: A classificação etária é consistente em 100% dos registros conforme a data de nascimento.
- [ ] G-03: A listagem filtrada por grupo responde em menos de 200ms.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Faixas etárias suportadas | 3 | 3 | contínuo |
| Latência de listagem P95 | ~120ms | < 200ms | contínuo |
| Divergência de faixa entre app e API | 0 | 0 | contínuo |

---

## 4. Non-Goals

- NG-01: Não envia notificação automática no dia do aniversário nesta versão.
- NG-02: Não importa aniversários de contatos do telefone ou de redes sociais.
- NG-03: Não permite faixas etárias customizáveis pelo usuário; os limites são fixos.

---

## 5. Usuários e Personas

**Usuário primário:** Responsável institucional que organiza homenagens por faixa etária.
**Usuário secundário:** Membro que consulta a lista de aniversariantes da agenda.

**Jornada atual (sem a feature):** Cálculo manual de idade e separação por faixa em planilhas.

**Jornada futura (com a feature):** O usuário cadastra a data de nascimento e o sistema agrupa automaticamente por faixa etária.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O usuário deve poder cadastrar aniversário com nome e data de nascimento obrigatórios | Must | POST sem name ou birthDate retorna 400 |
| RF-02 | O sistema deve aceitar telefone e notas opcionais | Must | Campos opcionais persistidos quando enviados |
| RF-03 | O sistema deve calcular a faixa etária CRIANCA (0–11), JOVEM (12–17) ou ADULTO (18+) na resposta | Must | Pessoa com 12 anos classifica como JOVEM |
| RF-04 | O usuário deve poder filtrar a listagem por grupo etário | Must | GET com group=CRIANCA retorna apenas crianças |
| RF-05 | O sistema deve listar aniversários apenas das agendas do usuário | Must | Aniversários de agenda alheia não retornam |
| RF-06 | O sistema deve exigir papel de escrita para criar, editar e excluir | Must | VIEWER recebe 403 ao alterar |

### 6.2 Fluxo Principal (Happy Path)

1. O usuário cadastra um aniversariante informando nome e data de nascimento.
2. O sistema persiste o registro vinculado à agenda.
3. O usuário consulta a lista filtrando pelo grupo Crianças.
4. O sistema calcula a faixa de cada registro e retorna apenas os do grupo solicitado.
5. Resultado: o usuário enxerga os aniversariantes do grupo com a faixa já calculada.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Listagem sem filtro:**
1. O usuário consulta sem informar grupo.
2. O sistema retorna todos os aniversariantes com a faixa etária calculada em cada item.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | Listagem P95 < 200ms | Cálculo de faixa em memória |
| RNF-02 | Consistência | Faixa calculada na API, não persistida | Evita idade desatualizada no banco |
| RNF-03 | Segurança | Escrita restrita a OWNER/EDITOR | Validado por requireCalendar |

---

## 8. Design e Interface

**Componentes afetados:** `server/src/routes/birthdays.js`, telas `app/app/(tabs)/birthdays.tsx` e `app/app/birthday-form.tsx`.

**Comportamento esperado:** A tela mostra aniversariantes agrupados por faixa; um seletor permite filtrar por grupo.

**Estados da UI:**
- Estado vazio: convite para cadastrar o primeiro aniversário.
- Estado de carregamento: indicador enquanto a lista carrega.
- Estado de erro: aviso de falha com opção de recarregar.
- Estado de sucesso: aniversariantes agrupados por faixa.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
Birthday {
  id: String (cuid, PK)
  calendarId: String
  name: String
  birthDate: DateTime
  phone: String?
  notes: String?
  createdAt: DateTime
  // faixa etária (CRIANCA/JOVEM/ADULTO) calculada na API, não armazenada
}
```

**Migrações necessárias:** Não para os campos atuais.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| Spec de Agendas e Compartilhamento | Obrigatória | Sem agenda não há onde registrar aniversários |
| Relógio do servidor | Obrigatória | Data incorreta do servidor afeta o cálculo de idade |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Pessoa exatamente na borda da faixa | Idade igual a 12 anos | Classifica como JOVEM (limite inferior inclusivo) |
| EC-02: Data de nascimento futura | birthDate posterior a hoje | Idade negativa tratada como dado inválido; retorna 400 |
| EC-03: Grupo de filtro inválido | group fora dos três valores | Ignora o filtro e retorna todos |
| EC-04: Nome ou data ausentes | POST incompleto | Retorna 400 com mensagem clara |
| EC-05: Falha do banco | Banco indisponível ou timeout | Retorna 500 com erro registrado no log |

---

## 12. Segurança e Privacidade

- **Autenticação:** Token obrigatório.
- **Autorização:** Leitura por membros da agenda; escrita por OWNER/EDITOR.
- **Dados sensíveis:** Nome, data de nascimento e telefone são PII; isolados por agenda.
- **Auditoria:** Não requerida nesta versão.

---

## 13. Plano de Rollout

- **Estratégia:** Já implementado; notificação de aniversário fica para versão futura.
- **Como reverter (rollback):** Reverter commits sem afetar dados persistidos.
- **Monitoramento pós-deploy:** Observar latência e consistência da faixa entre app e API.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | Haverá notificação automática no dia do aniversário? | Médio | Daniel | 60 dias |
| OQ-02 | Os limites das faixas devem ser configuráveis por instituição? | Baixo | Daniel | 90 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Faixa calculada na API | Persistir a faixa no banco | Evita idade desatualizada com o tempo |
| Limites fixos 0–11 / 12–17 / 18+ | Faixas configuráveis | Atende o uso institucional atual |
| Limite inferior inclusivo | Limite superior inclusivo | Convenção consistente de borda |

---

## Apêndice

### Referências
- Documento de arquitetura em `docs/architecture.md`
- Implementação em `server/src/routes/birthdays.js`

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
