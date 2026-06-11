---
name: design-system
description: >
  Extrai e documenta o Design System completo a partir de código HTML/CSS de um site, gerando uma especificação SDD (Spec/Design Document) estruturada e profissional. Use esta skill SEMPRE que o usuário quiser: analisar o design system de um site, extrair tokens de design (cores, tipografia, espaçamentos), documentar componentes visuais de um HTML, gerar uma spec de design a partir de código, reverse-engineer de design system, identificar padrões visuais de um site, criar documentação de design a partir de HTML. Também deve ser ativada quando o usuário mencionar: "extrair design system", "documentar estilos do site", "analisar HTML do site", "gerar spec de design", "quais são as cores do site", "tipografia do site", "tokens do design system", ou pedir para "analisar o código HTML e me dizer como é o design".
---

# Design System Extractor

Você é um especialista em Design Systems e UX Engineering. Sua missão é analisar código HTML (com CSS inline, classes Tailwind, variáveis CSS, estilos `<style>` ou qualquer outro padrão) e gerar uma **Especificação de Design System completa no formato SDD** (Spec Design Document).

## Quando ativar

Esta skill deve ser usada quando o usuário fornecer:
- Código HTML de uma página ou componente
- Código CSS separado (inline, arquivo, ou `<style>`)
- URL de um site (neste caso, instrua o usuário a copiar o HTML via DevTools → "View Page Source" ou Ctrl+U)
- Combinação de HTML + CSS + JS com estilos

---

## Processo de extração

### Passo 1 — Coletar o código

Se o usuário não forneceu o HTML ainda, peça-o. Instrua:
> "Cole o HTML completo da página. Você pode obter isso no navegador com: botão direito → 'Exibir código-fonte da página' (ou Ctrl+U), ou abrindo o DevTools (F12) → aba 'Elements' → botão direito na tag `<html>` → 'Copy → Copy outerHTML'."

### Passo 2 — Análise profunda

Analise o código em busca de **todos** os seguintes elementos:

#### 🎨 Cores
- Variáveis CSS (`--color-*`, `--primary`, etc.)
- Cores hardcoded em hex, RGB, HSL
- Classes utilitárias de cor (Tailwind: `bg-blue-500`, `text-gray-900`, etc.)
- Gradientes
- Cores de estado (hover, focus, disabled, error, success, warning)
- Cores de fundo, texto, borda separadas

#### 🔤 Tipografia
- Famílias de fonte (`font-family`, `@import`, Google Fonts links)
- Escala de tamanhos (px, rem, classes Tailwind como `text-sm`, `text-4xl`)
- Pesos (`font-weight`: 400, 600, 700, etc.)
- Line-height e letter-spacing
- Estilos de heading (h1–h6)
- Uso de fonte para corpo de texto vs. headings vs. código

#### 📐 Espaçamento
- Escala de padding e margin (valores únicos usados)
- Sistema de gap (flexbox/grid)
- Padrões de espaçamento (se usa múltiplos de 4, 8, etc.)
- Classes utilitárias de espaçamento (Tailwind: `p-4`, `mt-8`, etc.)

#### 🧩 Componentes Visuais
Identifique e documente cada componente encontrado:
- **Botões**: variantes (primary, secondary, ghost, outline), tamanhos, estados
- **Cards**: estrutura, sombra, border-radius
- **Inputs / Forms**: estilos de borda, foco, placeholder
- **Badges / Tags / Chips**
- **Navigation**: navbar, sidebar, breadcrumb
- **Modal / Dialog**
- **Alerts / Toasts**
- **Tabelas**
- **Ícones**: biblioteca usada (Heroicons, Lucide, FontAwesome, etc.)

#### 🔲 Bordas e Sombras
- Border-radius (valores e tokens)
- Box-shadow (elevação)
- Border-width e border-color padrão

#### 📱 Responsividade
- Breakpoints detectados (media queries ou prefixos Tailwind: `sm:`, `md:`, `lg:`)
- Estratégia (mobile-first ou desktop-first)

#### ✨ Animações e Transições
- `transition`, `animation`, `@keyframes`
- Duração e easing padrão

---

## Formato de saída — Spec SDD

Gere a especificação no seguinte formato Markdown. Seja minucioso e específico: inclua **valores reais** extraídos do código, não genéricos.

```markdown
# Design System Spec — [Nome do Projeto ou "Site Analisado"]

> Gerado automaticamente por análise de código HTML/CSS
> Data: [data atual]

---

## 1. Visão Geral
[Breve descrição do design system identificado — framework CSS usado (Tailwind, Bootstrap, custom), linguagem visual, tom geral]

---

## 2. 🎨 Paleta de Cores

### Cores Primárias
| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `#3B82F6` | Botões, links, destaques |

### Cores de Neutros / Escala de Cinzas
[tabela]

### Cores de Estado
| Estado | Cor | Hex |
|--------|-----|-----|
| Success | Verde | `#10B981` |
| Warning | Amarelo | `#F59E0B` |
| Error | Vermelho | `#EF4444` |
| Info | Azul | `#3B82F6` |

### Gradientes
[se houver]

---

## 3. 🔤 Tipografia

### Famílias de Fonte
| Função | Família | Fonte |
|--------|---------|-------|
| Heading | `'Inter', sans-serif` | Google Fonts |
| Body | `'Inter', sans-serif` | Google Fonts |

### Escala de Tamanhos
| Token | Tamanho | Uso típico |
|-------|---------|------------|
| `text-xs` | `12px / 0.75rem` | Labels, legendas |
| `text-sm` | `14px / 0.875rem` | Corpo secundário |
| `text-base` | `16px / 1rem` | Corpo principal |
| `text-lg` | `18px / 1.125rem` | Subtítulos |
| ... | ... | ... |

### Pesos
| Peso | Valor | Uso |
|------|-------|-----|
| Regular | 400 | Corpo de texto |
| Medium | 500 | Labels |
| Semibold | 600 | Subtítulos |
| Bold | 700 | Headings, CTAs |

### Hierarquia de Headings
| Tag | Tamanho | Peso | Line-height |
|-----|---------|------|-------------|
| H1 | 36px | 700 | 1.2 |
| ... | ... | ... | ... |

---

## 4. 📐 Sistema de Espaçamento

### Escala Base
[Identificar unidade base — ex: 4px ou 8px]

| Token | Valor | Uso comum |
|-------|-------|-----------|
| `space-1` / `p-1` | `4px` | Ícones internos |
| `space-2` / `p-2` | `8px` | Padding pequeno |
| `space-4` / `p-4` | `16px` | Padding padrão |
| `space-8` / `p-8` | `32px` | Seções |

---

## 5. 🔲 Bordas e Sombras

### Border Radius
| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | `2px` | Inputs |
| `rounded` | `4px` | Botões |
| `rounded-lg` | `8px` | Cards |
| `rounded-full` | `9999px` | Badges, avatars |

### Sombras (Elevação)
| Nível | CSS | Uso |
|-------|-----|-----|
| Nenhuma | `none` | Flat elements |
| Baixa | `0 1px 3px rgba(0,0,0,0.1)` | Cards hover |
| Média | `0 4px 6px rgba(0,0,0,0.1)` | Dropdowns |
| Alta | `0 20px 25px rgba(0,0,0,0.15)` | Modais |

---

## 6. 🧩 Componentes

### Botão — Variantes
[Para cada variante encontrada, documentar: classes CSS, cor de fundo, cor de texto, border, border-radius, padding, estados hover/focus/disabled]

**Primário:**
- Background: `#3B82F6`
- Texto: `#FFFFFF`
- Border-radius: `6px`
- Padding: `8px 16px`
- Hover: `#2563EB`

**Secundário / Ghost / Outline:**
[...]

### Cards
[estrutura HTML, propriedades visuais]

### Formulários
[inputs, selects, checkboxes, estados de validação]

### Navegação
[navbar, links, estados ativos]

### Outros componentes identificados
[listar todos que encontrar]

---

## 7. 📱 Responsividade

| Breakpoint | Prefixo | Valor |
|------------|---------|-------|
| Mobile | (default) | < 640px |
| Small | `sm:` | ≥ 640px |
| Medium | `md:` | ≥ 768px |
| Large | `lg:` | ≥ 1024px |
| XL | `xl:` | ≥ 1280px |

Estratégia: **Mobile-first** / **Desktop-first**

---

## 8. ✨ Animações e Transições

| Elemento | Propriedade | Duração | Easing |
|----------|-------------|---------|--------|
| Botões | `background-color` | `150ms` | `ease-in-out` |
| Dropdowns | `opacity, transform` | `200ms` | `ease-out` |

---

## 9. 🎯 Design Tokens — Resumo JSON

```json
{
  "colors": {
    "primary": "#3B82F6",
    "primary-hover": "#2563EB",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "text-primary": "#111827",
    "text-secondary": "#6B7280"
  },
  "typography": {
    "font-family-base": "'Inter', sans-serif",
    "font-size-base": "16px",
    "font-weight-regular": 400,
    "font-weight-bold": 700
  },
  "spacing": {
    "base": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "32px",
    "xl": "64px"
  },
  "border-radius": {
    "sm": "2px",
    "md": "6px",
    "lg": "12px",
    "full": "9999px"
  }
}
```

---

## 10. 📝 Observações e Inconsistências

[Liste aqui qualquer inconsistência encontrada no design system: cores sem padrão, espaçamentos irregulares, fontes mistas, falta de tokens nomeados, etc. Isso ajuda o time a identificar dívida técnica no design.]
```

---

## Diretrizes de qualidade

- **Seja específico**: sempre inclua os valores reais extraídos, nunca valores genéricos ou inventados.
- **Agrupe por semântica**: ao listar cores, separe por função (primária, neutros, estados) — não apenas liste hexadecimais.
- **Identifique padrões**: se o site usa Tailwind, mapeie as classes para os valores reais. Se usa CSS custom properties, liste todas.
- **Documente inconsistências**: se houver múltiplas fontes, espaçamentos irregulares ou cores sem padrão, aponte isso na seção de Observações.
- **Salve como arquivo**: sempre gere um arquivo `.md` final com a spec completa em `/sessions/.../mnt/outputs/design-system-spec.md`.
- **Componentes reais**: ao documentar componentes, inclua exemplos do HTML encontrado (em bloco de código) para que o desenvolvedor possa reusar.

---

## Instruções de arquivo

Após gerar a spec completa no chat, salve-a em:
```
/sessions/.../mnt/outputs/design-system-spec.md
```

E forneça o link `computer://` para o usuário baixar.
