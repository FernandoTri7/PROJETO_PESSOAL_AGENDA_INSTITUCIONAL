---
name: sdd-spec
description: >
  Cria, itera e avalia specs de features seguindo Spec-Driven Development (SDD).
  Use esta skill SEMPRE que o usuário quiser especificar, documentar ou detalhar uma feature,
  funcionalidade, sistema ou comportamento antes de implementar — especialmente quando mencionar
  palavras como "spec", "especificação", "RFC", "documento de requisitos", "quero planejar antes
  de codar", "preciso de uma spec", "escreva os requisitos", "defina o comportamento esperado",
  "avalie essa spec", "minha spec está boa?", "preciso refinar essa spec" ou qualquer combinação
  de feature + documentar/especificar/planejar/requisito/comportamento.

  Também ativa quando o usuário disser "quero implementar X" mas não tiver uma spec ainda —
  a skill ajuda a criar uma antes de qualquer linha de código.

  Entrega: arquivo .md com a spec completa + score de qualidade (0–100) com análise de gaps.
---

# Spec-Driven Development (SDD) Skill

Esta skill conduz o processo completo de SDD: **entrevistar → redigir → avaliar → iterar** até a spec estar pronta para implementação.

## Por que SDD?

Specs escritas antes do código economizam tempo porque:
- Tornam ambiguidades visíveis antes de virarem bugs
- Alinham expectativas entre quem pede e quem implementa
- Servem de referência permanente para testes, revisões e onboarding
- Permitem que LLMs implementem com muito mais precisão

A metodologia aqui é **RFC Pragmático + LLM-First**: estruturado como um RFC (Problem / Goals / Design / Edge Cases), mas otimizado para ser consumido por humanos e por agentes de IA.

---

## Fluxo de trabalho

### Fase 1 — Entrevista Estruturada

Antes de escrever uma linha da spec, conduza uma entrevista rápida para extrair o máximo de contexto. Faça as perguntas **uma a uma** (não todas juntas — é intimidador).

Perguntas obrigatórias a cobrir:
1. **O problema**: "Qual problema isso resolve? Quem sente esse problema?"
2. **O sucesso**: "Como você saberá que a feature funcionou? O que o usuário consegue fazer que não conseguia antes?"
3. **O escopo**: "O que está explicitamente FORA do escopo nessa primeira versão?"
4. **Os usuários**: "Quem vai usar isso? Qual o nível técnico deles?"
5. **Restrições**: "Tem alguma restrição técnica, de prazo ou de segurança importante?"
6. **Edge cases conhecidos**: "Você já consegue antecipar casos difíceis ou situações de erro?"

Se o usuário já forneceu contexto suficiente, pule as perguntas já respondidas. O objetivo é coleta rápida, não burocracia.

---

### Fase 2 — Redigir a Spec

Use o template em `references/spec_template.md`. Preencha **todas** as seções, mesmo que brevemente. Seções em branco devem ter `> Não aplicável` ou uma explicação do porquê.

Diretrizes de escrita:
- **Requisitos funcionais**: use o formato `RF-01`, `RF-02`... Cada um deve ser testável isoladamente (evite "o sistema deve ser rápido" — prefira "o sistema deve responder em < 200ms para 95% das requests")
- **Comportamentos**: descreva o que acontece, não como implementar. A spec define o **quê**, não o **como**
- **Ambiguidade zero**: se você não tiver certeza de algo, marque com `⚠️ ABERTO:` e adicione à lista de Open Questions
- **LLM-readiness**: escreva como se um desenvolvedor (ou LLM) fosse implementar a partir desse documento sem fazer perguntas adicionais

---

### Fase 3 — Avaliação Automática de Qualidade

Após redigir (ou quando receber uma spec do usuário para avaliar), execute o scorer:

```bash
python scripts/spec_scorer.py --spec caminho/para/spec.md
```

O script retorna:
- **Score total** (0–100) com breakdown por dimensão
- **Gaps críticos** que precisam ser resolvidos antes de implementar
- **Sugestões** de melhoria ordenadas por impacto

Dimensões avaliadas (ver `references/evaluation_rubric.md` para detalhes):
| Dimensão | Peso | O que avalia |
|----------|------|--------------|
| Completude | 30% | Todas as seções preenchidas, requisitos cobertos |
| Testabilidade | 25% | Requisitos verificáveis, critérios de aceite claros |
| Clareza | 20% | Ausência de ambiguidades, linguagem precisa |
| Escopo | 15% | Non-goals definidos, limites claros |
| Edge Cases | 10% | Casos de erro e limites do sistema cobertos |

---

### Fase 4 — Iteração

Com base no score e nos gaps identificados:

1. Se o score for **≥ 80**: a spec está pronta. Informe o usuário e entregue o arquivo.
2. Se o score for **60–79**: faça as correções óbvias automaticamente, depois pergunte sobre os gaps de alta prioridade.
3. Se o score for **< 60**: a spec precisa de mais entrevista. Volte à Fase 1 com perguntas focadas nos gaps.

A cada iteração, mostre o **delta do score** (ex: "subiu de 54 → 71, faltam 2 gaps críticos").

---

### Fase 5 — Entrega

Salve a spec final como `{nome-da-feature}-spec.md` e entregue ao usuário. O nome do arquivo deve usar kebab-case e ser descritivo (ex: `user-authentication-spec.md`, `payment-checkout-spec.md`).

Inclua no final do arquivo o **relatório de avaliação** gerado pelo scorer.

---

## Modo: Avaliação de Spec Existente

Se o usuário enviar uma spec já escrita para avaliação:

1. Execute `scripts/spec_scorer.py` na spec recebida
2. Apresente o score com análise detalhada de cada dimensão
3. Liste os gaps em ordem de criticidade (bloqueadores → importantes → melhorias)
4. Pergunte se o usuário quer que você corrija os pontos apontados

---

## Arquivos de Referência

| Arquivo | Quando usar |
|---------|-------------|
| `references/spec_template.md` | Template completo com todas as seções — use como base para redigir |
| `references/evaluation_rubric.md` | Critérios detalhados de avaliação por dimensão |
| `references/sdd_guide.md` | Princípios da metodologia e boas práticas |
| `assets/spec_examples.md` | Exemplos de spec boa vs. ruim com anotações |

---

## Sinais de uma Spec Ruim (evite)

- Requisitos que não podem ser testados ("o sistema deve ser intuitivo")
- Seção de escopo ausente ou vaga ("vamos ver o que faz sentido")
- Misturar design técnico de implementação com comportamento esperado
- Requisitos contraditórios não sinalizados
- Nenhum critério de aceite definido
- Edge cases de erro completamente ausentes

## Sinais de uma Spec Boa (busque)

- Qualquer desenvolvedor pode implementar sem fazer perguntas
- Qualquer QA pode escrever testes a partir dela
- Os non-goals estão tão claros quanto os goals
- Casos de erro têm comportamento definido
- Cada requisito tem um ID único rastreável
