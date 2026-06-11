# Design System Spec — Agenda Institucional

> Derivado da base portável **TRI7 CRM** ([design-system-portable.md](../../Skills/design-system-portable.md)) — tokens **copiados idênticos** (teal + laranja); só a **marca** muda.
> Adaptado do stack web (Tailwind/shadcn) para o stack real do projeto: **Expo (React Native + React Native Web)**, com tokens em `theme.ts` + CSS variables no web.
> Data: 2026-06-10 · Marca: **Agenda** · Sufixo: **Institucional** · Temas: **light (padrão) + dark**

---

## 1. Visão Geral

Linguagem visual **institucional, sólida e legível**: teal (verde petróleo) como cor institucional/primary, laranja como energia de CTA/foco. Muito white space, hierarquia forte, superfícies sólidas. **Sem gradientes, glassmorphism, neon ou efeitos futuristas** — apenas superfícies sólidas, cantos arredondados e sombras discretas.

- **Token-driven:** trocar um valor no `theme.ts` (e nas CSS variables do web) re-tematiza a app inteira. Não usar hex hardcoded nos componentes (exceto assets de marca).
- **Tipografia:** Inter (corpo) + DM Sans (títulos/display). Google Fonts no web; `expo-font` no nativo.
- **Ícones:** `@expo/vector-icons` (Ionicons ou MaterialCommunityIcons) — equivalente RN ao lucide-react do documento original. **Não misturar bibliotecas.** Substituir os emojis atuais (`nav-icon`) por ícones vetoriais.
- **Plataformas:** os mesmos tokens alimentam o nativo (objetos de estilo RN) e o web (CSS variables injetadas em [webCss.ts](../app/src/webCss.ts)).

> ⚠️ **Estado atual diverge da spec** (ver §12): hoje o nativo usa tema escuro azul-Google e o web usa navy+dourado serifado. Esta spec **unifica** ambos no sistema teal/laranja.

---

## 2. 🎨 Paleta de Cores

> Formato: `H S% L%` (HSL, padrão shadcn) + HEX oficial. No RN use o HEX; no web, as CSS variables HSL permitem opacidade (`hsl(var(--primary)/0.1)`).

### Cores-marca
| Token | HSL | HEX | Uso |
|-------|-----|-----|-----|
| `brand.teal` | `182 72% 21%` | `#0F5C5E` | Institucional → **primary** |
| `brand.tealDark` | `183 78% 13%` | `#073C3E` | Sidebar, superfícies escuras |
| `brand.orange` | `37 91% 53%` | `#F5A018` | **CTA / conversão / foco** |
| `brand.orangeDark` | `32 93% 44%` | `#D67708` | Hover/active **e texto laranja sobre branco** (AA) |

> ⚠️ **A11y do laranja:** `#F5A018` + texto branco reprova AA em texto pequeno. Use laranja em **preenchimentos/CTAs grandes**; texto laranja sobre branco = `#D67708`.

### Superfície / Neutros — LIGHT (padrão)
| Token | HSL | HEX | Uso |
|-------|-----|-----|-----|
| `background` | `200 14% 97%` | `#F5F7F8` | Fundo da app |
| `foreground` | `210 24% 16%` | `#1F2933` | Texto primário |
| `card` / `popover` | `0 0% 100%` | `#FFFFFF` | Superfícies (cards, modais) |
| `secondary` | `200 16% 94%` | `#EBEFF1` | Botão secundário, chips |
| `secondaryForeground` | `210 24% 20%` | `#283139` | — |
| `muted` | `200 14% 95%` | `#EEF1F2` | Fundos suaves |
| `mutedForeground` | `209 14% 37%` | `#52606D` | Texto secundário |
| `border` / `input` | `201 15% 88%` | `#DCE2E5` | Bordas |
| `ring` | `37 91% 53%` | `#F5A018` | **Anel de foco (laranja)** |

### Superfície / Neutros — DARK
| Token | HSL | HEX (aprox.) |
|-------|-----|------|
| `background` | `200 22% 9%` | `#12191C` |
| `foreground` | `200 12% 92%` | `#E8EBED` |
| `card` / `popover` | `200 18% 12%` | `#192024` |
| `primary` | `182 60% 42%` | `#2BA7AB` |
| `accent` (laranja) | `37 92% 58%` | `#F6AB31` |
| `border` / `input` | `200 12% 22%` | `#313A3F` |
| `ring` | `37 92% 58%` | `#F6AB31` |
| `sidebar.background` | `200 24% 7%` | `#0E1316` |

> Demais estados (success/warning/etc.) no dark = mesmos hues, **+10% de L** aprox. Dark é secundário; priorizar light.

### Cores de Estado (light e dark)
| Estado | Token | HSL | HEX |
|--------|-------|-----|-----|
| Success | `success` | `142 71% 45%` | `#22C55E` |
| Warning | `warning` | `38 92% 50%` | `#F59E0B` |
| Danger | `destructive` | `0 84% 60%` | `#EF4444` |
| Info | `info` | `182 72% 21%` | `#0F5C5E` (teal da marca) |

Foreground de estado: `#FFFFFF`. Em chips/realces use o tom translúcido + texto na cor: `bg success/15 + text success`.

### Sidebar (âncora de marca — teal profundo)
| Token | HSL | HEX |
|-------|-----|-----|
| `sidebar.background` | `183 78% 12%` | `#073C3E` |
| `sidebar.foreground` | `185 16% 86%` | `#D3E0E0` |
| `sidebar.primary` | `37 91% 53%` | `#F5A018` (item ativo) |
| `sidebar.accent` | `183 50% 18%` | hover de item |
| `sidebar.border` | `183 45% 17%` | — |

### Cores de domínio — Categorias e Sessões
Padronizar as listas hoje duplicadas (`CATEGORIES` em [theme.ts](../app/src/theme.ts) e `NAV_CATS` em [webCss.ts](../app/src/webCss.ts)) numa única fonte, alinhada aos tokens:

| Categoria | HEX | Observação |
|-----------|-----|-----------|
| Sessão (escala/instrutiva/extra) | família teal `#0F5C5E` → `#0a6640` | usar tons do teal institucional |
| Reunião | `#1F2933` (foreground/navy neutro) | sóbrio |
| Aniversário | `#F5A018` (accent) | usa o laranja da marca |
| Evento especial / Comemorativa | `#D67708` (orange-dark) | — |
| Trabalho | `#0F5C5E` | teal |
| Família | `#22C55E` (success) | — |
| Viagem | `#7c3aed` (roxo de apoio) | cor de apoio fora do core |
| Outro / Livre | `#52606D` (muted-foreground) | neutro |

> Mantenha cores de categoria como **tokens nomeados**, não hex soltos nas telas.

### ❌ Gradientes — PROIBIDOS
Substituir por **tints sólidos**: `primary/10`, `accent/12`, `success/12`, `info/10`, `secondary`. Ex.: chip de ícone de KPI = fundo `primary/10` + ícone `text primary`.

---

## 3. 🔤 Tipografia

### Famílias
- **Body:** `Inter`, system-ui, sans-serif — pesos 400 / 500 / 600 / 700
- **Display (títulos):** `DM Sans`, Inter, system-ui — pesos 500 / 600 / 700
- **Mono (opcional):** `JetBrains Mono` — IDs/código

**Web** ([webCss.ts](../app/src/webCss.ts)): trocar o `@import` atual (Libre Baskerville + DM Sans) por:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');
body { font-family:'Inter',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
h1,h2,h3,h4,h5,h6,.font-display { font-family:'DM Sans','Inter',system-ui,sans-serif; letter-spacing:-0.01em; }
```
**Nativo:** carregar via `expo-font` (`Inter_400/500/600/700`, `DMSans_500/600/700`) e mapear nos tokens de tipografia.

> ⚠️ Remover a fonte serifada **Libre Baskerville** (`.font-serif`, `.topbar-brand`, `.page-title`, `.modal-title`, `.cal-nav-title`): fora do sistema. Títulos passam a DM Sans.

### Escala (Tailwind-equivalente, em px)
`xs 12` · `sm 14` · `base 16` · `lg 18` · `xl 20` · `2xl 24` · `3xl 30` · `4xl 36` · `5xl 48`

### Estilos nomeados
| Token | Composição | Uso |
|-------|-----------|-----|
| `display` | DM Sans, 36/48px bold, tracking-tight, lh 1.05 | Hero / números grandes |
| `h1` | DM Sans, 30px bold, tracking-tight | Título de página |
| `h2` | DM Sans, 24px semibold | Section header |
| `h3` | DM Sans, 18px semibold | Card title |
| `body` | Inter, 14px, lh relaxed | Corpo |
| `caption` | Inter, 12px, muted | Legendas |
| `eyebrow` | Inter, 11px uppercase, tracking 0.14em, semibold, muted | Rótulo de seção/KPI |

---

## 4. 📐 Espaçamento

Base **4px**. Padrões:
- Cards: `p-5`/`p-6` (header `p-6 pb-3`, content `p-6 pt-0`).
- List items: `py-3 px-4`. Forms: `space-y-4`. Seções: `space-y-6`.
- Container web: centralizado, padding `2rem`, max **1400px**. (Hoje a `.page` usa max 1280px — alinhar para 1400.)

Escala: `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64`.

---

## 5. 🔲 Raio, Elevação e Movimento

### Raio
| Token | Valor | Uso |
|-------|-------|-----|
| `radius` (base) | `10px` | inputs, botões, badges |
| `radius.lg` | `14px` | cards, dialogs |
| `radius.xl` | `20px` | superfícies grandes / KPI |
| `radius.md` | `8px` | (base − 2) |
| `radius.full` | `9999px` | pills, avatars, FAB |

### Elevação (sombras discretas, SEM glow)
Web (CSS):
```css
--elevation-1: 0 1px 2px  rgba(15,23,27,0.05);
--elevation-2: 0 2px 6px  rgba(15,23,27,0.07);
--elevation-3: 0 8px 20px rgba(15,23,27,0.08);
--elevation-4: 0 16px 40px rgba(15,23,27,0.10);
```
Nativo (RN `shadow*` + `elevation`):
| Nível | shadowColor | shadowOpacity | shadowRadius | shadowOffset | Android elevation |
|-------|-------------|---------------|--------------|--------------|-------------------|
| 1 | `#0F171B` | 0.05 | 2 | `{0,1}` | 1 |
| 2 | `#0F171B` | 0.07 | 6 | `{0,2}` | 2 |
| 3 | `#0F171B` | 0.08 | 20 | `{0,8}` | 6 |
| 4 | `#0F171B` | 0.10 | 40 | `{0,16}` | 12 |

**Regras:** card em repouso = só `border`; hover (web) = `elevation-3`; popover/modal = `elevation-4`; **botões nunca têm sombra** (exceto sombra sutil no primary/accent). FAB pode manter sombra média.

### Movimento
`fast 120ms · normal 200ms · slow 320ms` · easing `cubic-bezier(0.2,0,0,1)`. Hover de botão/card ~150–200ms (`transition-colors`/`transition-shadow`); modal/sheet fade+slide 200–300ms.

---

## 6. 🪪 Marca / Logo — "Agenda Institucional"

**Wordmark:** **`Agenda`** em **DM Sans bold**, com **`INSTITUCIONAL`** abaixo em uppercase, `tracking 0.38em`, na cor de acento (laranja `#D67708` sobre fundo claro, para contraste AA; laranja `#F5A018` sobre fundo escuro), ladeado por filetes finos. Em fundo escuro (sidebar/login) o "Agenda" usa branco (`currentColor`).

**Símbolo (gerado, seguindo o sistema):** **app-icon tile** quadrado com canto `rounded-[14/64]` em **teal `#0F5C5E`**, contendo um **glifo de calendário branco** com um **dia destacado em laranja `#F5A018`** (o "acento de conversão" do sistema). Usado em favicon, topo da sidebar e tela de login.

Sugestão de SVG base (favicon / `app/assets/icon.png` — exportar 512×512, 192, 48, e apple-touch 180):
```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="#0F5C5E"/>
  <rect x="14" y="16" width="36" height="34" rx="6" fill="#FFFFFF"/>
  <rect x="14" y="16" width="36" height="9" rx="6" fill="#073C3E"/>
  <rect x="21" y="12" width="4" height="9" rx="2" fill="#073C3E"/>
  <rect x="39" y="12" width="4" height="9" rx="2" fill="#073C3E"/>
  <rect x="33" y="33" width="11" height="11" rx="2.5" fill="#F5A018"/>
</svg>
```
**Componentes de marca a criar:** `AgendaMark` (app-icon), `AgendaWordmark` (texto) e um `BrandLogo` com variantes `symbol | appicon | wordmark | lockup`. Assets em `app/assets/`. No web, `topbar-brand` passa a renderizar o lockup (símbolo + wordmark) em vez do texto serifado atual.

`app.json` (Expo): `name: "Agenda Institucional"`, ícones em `app/assets/icon.png`; web `themeColor: #0F5C5E`.

---

## 7. 🧩 Componentes (tokens → RN + web)

> As classes shadcn do documento original viram **objetos de estilo RN** (nativo) e **classes CSS** equivalentes (web, em `webCss.ts`). Abaixo, os valores normativos.

### Botão
Base: `inline-flex`, `gap 8`, `radius 10` (md=8), `text-sm font-medium (Inter 500)`, `transition-colors`, foco `ring 2 ring(orange) offset 2`, disabled `opacity 0.5`.
| Variant | Fundo | Texto | Hover |
|---------|-------|-------|-------|
| `default` (primary) | `primary #0F5C5E` | branco | `primary-hover` (teal −6% L) + sombra sutil |
| `accent` (CTA) | `accent #F5A018` | `#1F2933`/branco | `accent-hover #D67708` |
| `secondary` | `secondary #EBEFF1` | `#283139` | `secondary/80` |
| `outline` | `card #FFF` + `border` | `foreground` | `secondary` |
| `ghost` | transparente | `foreground` | `secondary` |
| `link` | transparente | `primary` | underline |
| `destructive` | `#EF4444` | branco | `/90` |

Tamanhos: `default h-40 px-16` · `sm h-36 px-12` · `lg h-44 px-24 text-base` · `icon 40×40` · `xs h-28 px-8 text-xs` (px em RN). **Botão só-ícone exige `accessibilityLabel`.**

> Mapeamento do CSS atual: `.btn-primary` → variant default (troca navy→teal); `.btn-gold` → variant accent (dourado→laranja); demais mantêm o papel.

### Badge / Pill / Tag
Base: `radius-full`, `px 10 py 2`, `text-xs font-semibold`.
`default bg primary` · `secondary bg secondary` · `success bg success/15 text success` · `warning bg warning/15 text warning` · `info bg info/15 text info` · `accent bg accent/15 text accent` · `outline border + text foreground` · `muted bg muted text mutedForeground`.

### Input / Select / Textarea
`h 40, w full, radius 10, border input, bg card, px 12 py 8, text-sm`, placeholder `mutedForeground`, foco `ring 2 (orange) offset 2`, disabled `opacity 0.5`.
> `.form-input:focus` atual (borda navy + glow azul) → **borda + ring laranja**.

### Card
`radius-lg (14), border border/80, bg card`. Header `p-6 space-y-1.5`; Title `DM Sans 20 semibold tracking-tight`; Description `text-sm mutedForeground`; Content `p-6 pt-0`; Footer `flex items-center p-6 pt-0`.

### KPI / Stat Card (sem gradiente)
Tile `radius-xl border bg card p-5 elevation-1` (hover `elevation-3`): chip de ícone `44×44 radius-lg bg primary/10` + ícone `primary`; badge de delta `bg success/12 text success`; label `eyebrow`; valor `DM Sans 30 bold`; sub `text-xs mutedForeground`.
> `.stat-card` atual (borda-esquerda navy) → alinhar ao tile com chip de ícone teal.

### Modal / Dialog
Overlay `bg foreground/45` **sólido, sem blur** + fade. Painel `bg card radius-lg elevation-4`. Botão fechar (X) com `ring 2` + rótulo "Fechar". Header "de marca" opcional: `bg primary text branco p-6` com badges translúcidos `primaryForeground/15`.
> `.modal-backdrop`/`.modal` atuais já estão próximos; só trocar acentos navy→teal e remover serifa do `.modal-title`.

### Sidebar
`bg sidebar(#073C3E) text sidebarForeground`, largura `240px` (`w-64`). Topo: app-icon + wordmark. Item ativo: `bg sidebar.accent` + **barra lateral laranja** (3px) + ícone/label cheios; inativo `foreground/70 hover bg sidebar.accent/50`. Mobile (<900px): vira **drawer**/tab bar inferior (já existe `.mob-tabs`).
> `.nav-item.active` atual já usa barra dourada; trocar dourado→**laranja** e navy→teal.

### Topbar
`sticky top-0 h-56 (60px atual ok) border-b bg card px-16/24` **sem blur**. Hambúrguer (mobile) + brand/contexto + busca (`hidden md`) + ações + avatar.
> `.topbar` atual é navy; no sistema o topbar é **claro (`bg card`)** com brand teal — ou manter faixa teal como "header de marca" (escolha do time; default = claro).

### Tabela (sessões)
`border radius-lg overflow-hidden`; head `bg muted/50 + eyebrow`; linhas `divide-y border/60 hover bg muted/30`.
> `.sess-table` atual já segue esse padrão; só tokenizar cores.

### FAB
`radius-full 54×54 bg accent(#F5A018) text branco elevation` + `scale 1.07` no hover.
> `.fab` atual já é dourado → laranja.

### Calendário (componente-chave do produto)
- Grade: `border radius-lg`, head dos dias da semana `bg primary(teal) text branco/80`.
- Célula: `bg card min-h 86 p-6`, hover `muted`, selecionada `primary/8`, fora do mês `muted opacity 0.65`.
- "Hoje": número em círculo `bg primary text branco`.
- Evento no dia: barra/área na cor da **categoria** (tokens de §2), texto branco, `radius 3, text-[10px]`.
> `.cal-*` atuais: trocar navy→teal nos headers/hoje; manter a estrutura.

### Estados de UI
- **Vazio:** `.empty` — ícone + texto `mutedForeground`, centralizado.
- **Carregando:** spinner/skeleton em `muted`.
- **Erro:** `.form-error` — `bg destructive/8 border-left destructive text destructive`.
- **Sucesso:** toast/realce em `success`.

---

## 8. 📱 Responsividade (mobile-first)

| Breakpoint | Min | Estratégia |
|------------|-----|-----------|
| (default) | 0 | Sidebar→tab bar inferior; toolbars `wrap`; calendário scroll; tabelas `overflow-x` |
| `sm` | 640 | Cards 2 colunas |
| `md` | 768 | Busca no header |
| `lg` | 1024 | Sidebar fixa (240px); painel de marca no login |
| `xl` | 1280 | Layouts 3 colunas |
| `2xl` | 1536 | Container max 1400px |

> O web hoje quebra em **900px** (sidebar→tabs) e **600px**. Recomenda-se **migrar para a escala 640/768/1024/1280** para alinhar nativo (Dimensions) e web; ou documentar 900/600 como exceção consciente.

---

## 9. ♿ Acessibilidade (WCAG AA)
- Contraste: `primary`/`foreground` sobre `card` ≥ 7:1; `mutedForeground` ≈ 4.8:1.
- Laranja só em preenchimento; **texto laranja sobre branco = `#D67708`**.
- Foco visível (anel laranja `ring`) em **todos** os interativos.
- `accessibilityLabel` em botões só-ícone; navegação por teclado no web.

---

## 10. 🎯 Tokens — JSON (light + dark)

```json
{
  "brand": { "teal": "#0F5C5E", "tealDark": "#073C3E", "orange": "#F5A018", "orangeDark": "#D67708" },
  "light": {
    "background": "#F5F7F8", "foreground": "#1F2933", "card": "#FFFFFF",
    "primary": "#0F5C5E", "primaryForeground": "#FFFFFF",
    "accent": "#F5A018", "accentHover": "#D67708", "accentForeground": "#1F2933",
    "secondary": "#EBEFF1", "secondaryForeground": "#283139",
    "muted": "#EEF1F2", "mutedForeground": "#52606D",
    "border": "#DCE2E5", "input": "#DCE2E5", "ring": "#F5A018",
    "success": "#22C55E", "warning": "#F59E0B", "destructive": "#EF4444", "info": "#0F5C5E",
    "sidebar": { "background": "#073C3E", "foreground": "#D3E0E0", "primary": "#F5A018", "accent": "#103E40", "border": "#123F41" }
  },
  "dark": {
    "background": "#12191C", "foreground": "#E8EBED", "card": "#192024",
    "primary": "#2BA7AB", "primaryForeground": "#06201F",
    "accent": "#F6AB31", "accentHover": "#D67708", "accentForeground": "#1F2933",
    "secondary": "#222B30", "secondaryForeground": "#E8EBED",
    "muted": "#1E262B", "mutedForeground": "#9BA7AE",
    "border": "#313A3F", "input": "#313A3F", "ring": "#F6AB31",
    "success": "#34D277", "warning": "#FBB13B", "destructive": "#F36B6B", "info": "#2BA7AB",
    "sidebar": { "background": "#0E1316", "foreground": "#D3E0E0", "primary": "#F6AB31", "accent": "#14343A", "border": "#1B3338" }
  },
  "typography": {
    "fontBody": "Inter, system-ui, sans-serif",
    "fontDisplay": "DM Sans, sans-serif",
    "weights": [400, 500, 600, 700],
    "scale": { "xs": 12, "sm": 14, "base": 16, "lg": 18, "xl": 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48 }
  },
  "spacingBase": 4,
  "radius": { "md": 8, "base": 10, "lg": 14, "xl": 20, "full": 9999 },
  "elevation": {
    "1": "0 1px 2px rgba(15,23,27,0.05)", "2": "0 2px 6px rgba(15,23,27,0.07)",
    "3": "0 8px 20px rgba(15,23,27,0.08)", "4": "0 16px 40px rgba(15,23,27,0.10)"
  },
  "motion": { "fast": 120, "normal": 200, "slow": 320, "ease": "cubic-bezier(0.2,0,0,1)" }
}
```

### Esboço de `theme.ts` (RN) — substitui o tema escuro atual
```ts
export const palette = { /* ...light/dark do JSON acima... */ };
export type Mode = 'light' | 'dark';
export const tokens = (mode: Mode) => palette[mode];
export const radius = { md: 8, base: 10, lg: 14, xl: 20, full: 9999 };
export const space = (n: number) => n * 4; // space(4) => 16
export const elevation = {
  1: { shadowColor: '#0F171B', shadowOpacity: 0.05, shadowRadius: 2,  shadowOffset: { width: 0, height: 1 },  elevation: 1 },
  2: { shadowColor: '#0F171B', shadowOpacity: 0.07, shadowRadius: 6,  shadowOffset: { width: 0, height: 2 },  elevation: 2 },
  3: { shadowColor: '#0F171B', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },  elevation: 6 },
  4: { shadowColor: '#0F171B', shadowOpacity: 0.10, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
};
```

---

## 11. 📦 Plano de aplicação no app (checklist)

1. **Tokens nativos:** reescrever [app/src/theme.ts](../app/src/theme.ts) com `palette` light+dark, `radius`, `space`, `elevation` (acima). Remover o tema escuro azul-Google fixo; expor um provider de modo (light padrão).
2. **CSS variables web:** em [app/src/webCss.ts](../app/src/webCss.ts), trocar `--navy/--gold/--bg/...` pelas variáveis do sistema (`--primary`, `--accent`, `--background`, `--card`, `--border`, `--muted-foreground`, `--ring`, `--sidebar*`) e adicionar bloco `.dark`.
3. **Fontes:** substituir Libre Baskerville+DM Sans por **Inter+DM Sans** (web `@import`; nativo `expo-font`). Remover usos de `.font-serif`.
4. **Cor de marca nos componentes:** navy→`--primary` (teal); dourado→`--accent` (laranja) em `.btn-primary/.btn-gold/.fab/.nav-item.active/.cal-*/.stat-card/.modal-title/.topbar`.
5. **Ícones:** trocar emojis (`nav-icon`, `mob-tab-icon`, `empty-icon`) por `@expo/vector-icons`.
6. **Categorias:** unificar `CATEGORIES` + `NAV_CATS` numa fonte única tokenizada (§2).
7. **Marca:** criar `AgendaMark`/`AgendaWordmark`, gerar `app/assets/icon.png` a partir do SVG (§6); `app.json` name/themeColor.
8. **Foco:** aplicar `ring` laranja em inputs/botões/links (`:focus-visible` no web; estados de foco no nativo).

---

## 12. 📝 Observações e Inconsistências (dívida de design atual)

| # | Inconsistência | Onde | Ação |
|---|----------------|------|------|
| 1 | **Duas identidades distintas**: nativo escuro azul-Google vs web claro navy+dourado | [theme.ts](../app/src/theme.ts) × [webCss.ts](../app/src/webCss.ts) | Unificar no sistema teal/laranja (esta spec) |
| 2 | **Fonte serifada** Libre Baskerville fora do sistema | `.font-serif`, títulos/topbar/modal | Migrar para DM Sans |
| 3 | **Hex hardcoded** em vez de tokens (`#1a73e8`, `#0F2A4A`, `#C9952A`, `#ef4444`…) | ambos | Centralizar em tokens |
| 4 | **Listas de categoria duplicadas e divergentes** (`CATEGORIES` 7 itens × `NAV_CATS` 16 itens) | theme.ts × webCss.ts | Fonte única tokenizada |
| 5 | **Ícones por emoji** (sem biblioteca vetorial) | `nav-icon`, `mob-tab-icon` | `@expo/vector-icons` |
| 6 | **Foco azul** (`box-shadow rgba(15,42,74,.08)`) em vez do anel laranja do sistema | `.form-input:focus` | Ring laranja `--ring` |
| 7 | **Breakpoints 900/600** divergem da escala 640/768/1024/1280 | `@media` em webCss | Alinhar ou documentar exceção |
| 8 | **Sem dark tokens no web** (só nativo tinha dark, agora unificado) | webCss | Adicionar bloco `.dark` |
| 9 | Container web **1280px** vs **1400px** da referência | `.page` | Alinhar para 1400 |

> O sistema é **token-driven**: ao aplicar §11, trocar um valor re-tematiza toda a app. Não reintroduzir gradientes/glass — é a regra que separa o "genérico" do institucional sólido.
