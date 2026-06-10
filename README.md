# Agenda Institucional e Pessoal

Sistema de agenda colaborativa (inspirado no Google Agenda / TimeTree) para uso **pessoal, familiar e institucional**, com módulo de **Controle de Sessões**. Base de código única para **iOS, Android e Web**.

## Estrutura

```
Agenda-Institucional/
├── server/   API REST — Node.js + Express + Prisma + SQLite (pronto para PostgreSQL)
├── app/      Aplicativo — Expo (React Native + React Native Web)
├── docs/     Documentação de arquitetura e do módulo de sessões
└── Imagens/  Material de referência (histórico de registros de sessões)
```

## Como rodar localmente

### 1. API (porta 4000)

```bash
cd server
npm install
npx prisma db push     # cria o banco SQLite (server/prisma/dev.db)
npm run db:seed        # dados de exemplo
npm run dev
```

Usuário inicial do seed: `daniel@tri7.com.br` / senha `123456` (perfil ADMIN).

### 2. Aplicativo (Web / iOS / Android)

```bash
cd app
npm install
npm start              # abre o Expo; tecle "w" para Web, ou leia o QR no Expo Go (iOS/Android)
```

No Web a API é acessada em `http://localhost:4000`. Para testar no celular, defina o IP da máquina em `app/src/api.ts` (`API_URL`).

## Funcionalidades

- **Múltiplas agendas** (pessoal, familiar, institucional) com compartilhamento por e-mail e papéis (OWNER / EDITOR / VIEWER)
- **Usuários** com níveis de acesso (ADMIN, GESTOR, MEMBRO, VISITANTE), autenticação JWT + bcrypt
- **Eventos** com categorias, cores, recorrência (RRULE), lembretes e pesquisa
- **Tarefas** com prioridade, prazo e conclusão
- **Aniversários** com classificação etária automática: Crianças (0–11), Jovens (12–17), Adultos (18+)
- **Controle de Sessões** (módulo institucional): tipo, dirigente, assistente, auxiliares, som, leitura de documentos, explanação, vegetal (descrição, coado, comungado, retorno), copos (simples/duplos/crianças/repetições) e estatísticas
- **Estoque de Vegetal**: lotes, origem, litros, localização (geladeira/fora)
- **Exportação ICS** (compatível com Google Agenda) e **backup/importação JSON**

## Expansão futura

A arquitetura é modular (rotas independentes na API, telas independentes no app): novos módulos — Tesouraria, Gestão documental, Biblioteca digital, Controle patrimonial, Gestão de membros, Portal institucional — entram como novas rotas + novas telas sem reestruturação. Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).
