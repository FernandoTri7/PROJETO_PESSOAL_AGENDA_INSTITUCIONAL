# Módulo Controle de Sessões

Estrutura definida a partir da análise do histórico real (`Imagens/_chat.txt`, ~8 anos de registros do grupo da Assistência).

## Campos identificados nos registros reais

| Campo no sistema | Como aparece nos registros | Tipo |
|---|---|---|
| `date` | "Sessão de escala 18/12/21" | data (obrigatório) |
| `type` | escala, escala anual, instrutiva, extra, adventícios, direção, comemorativa (Reis, Ano Novo, São Cosme e Damião, aniversário do núcleo/mestre) | lista |
| `title` | nome livre da sessão | texto |
| `dirigente` | "M. Dirigente: M. Hiran" | texto |
| `assistente` | "M. Assistente: M. Andrey" | texto |
| `auxAssistente` | "Auxiliares: Túlio e Fernando Falcão" | texto |
| `som` | "Som: Pedro Humberto" | texto |
| `leituraDocumentos` | "Documentos: C. Pollyane" | texto |
| `explanacao` | "Explanação: C. Leonel" | texto |
| `vegetalDescricao` | origem/preparo, uniões de lotes, retornos reaproveitados | texto |
| `coadoLitros` | "Coado: 10L" / "Vegetal coado 12.5L" | número |
| `comungadoLitros` | "Qtd vegetal comungando: 5 litros" (registros mais recentes) | número |
| `retornoLitros` | "Retorno: 2L" | número |
| `coposSimples` | "55 simples" | inteiro |
| `coposDuplos` | "3 duplos" | inteiro |
| `coposCriancas` | "22 para crianças" / "10 infantil" / "copos pequenos" | inteiro |
| `repeticoes` | "8 repetições" | inteiro |
| `observacoes` | observações livres (troca da assistência, etc.) | texto |

## Estoque de vegetal (`VegetalLote`)

Os registros incluem contagens periódicas de estoque ("Vegetal Total 203,5 l", "Sala do Vegetal — Geladeira 26.3L / Fora da Geladeira 101.3L"). O modelo guarda lotes com nome, origem, litros e local (GELADEIRA / FORA), e a API soma o total.

## Estatísticas (`GET /api/sessions/stats`)

Totais por período: nº de sessões, litros coados/retornados, copos por tipo, sessões por tipo. Base para relatórios futuros (consumo médio por sessão, frequência etc.).

## Evoluções sugeridas

- Cadastro de pessoas (mestres, conselheiros, sócios) para preencher os papéis por seleção em vez de texto livre.
- Baixa automática de estoque ao registrar sessão (coado − retorno).
- Importador do histórico de WhatsApp (`_chat.txt`) para carga inicial dos dados antigos.
