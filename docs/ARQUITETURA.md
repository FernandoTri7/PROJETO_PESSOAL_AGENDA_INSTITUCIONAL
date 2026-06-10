# Arquitetura

## Visão geral

| Camada | Tecnologia | Observações |
|---|---|---|
| Aplicativo | Expo (React Native + RN Web), expo-router, TypeScript | Uma base de código → iOS, Android e Web |
| API | Node.js + Express (ES Modules) | REST, JSON, JWT |
| Banco | SQLite via Prisma ORM | Trocar `provider` para `postgresql` na publicação — nenhuma mudança de código |

## Modelo de dados (resumo)

- `User` — usuários; `role`: ADMIN, GESTOR, MEMBRO, VISITANTE. Senha com bcrypt.
- `Calendar` — agendas múltiplas; `type`: PESSOAL, FAMILIAR, INSTITUCIONAL.
- `CalendarMember` — compartilhamento; `role`: OWNER, EDITOR, VIEWER. Toda autorização de escrita passa por aqui (`requireCalendar`).
- `Event` — eventos com categoria, cor, `rrule` (subconjunto iCalendar: FREQ/INTERVAL/COUNT/UNTIL) e `reminders` (minutos antes, CSV).
- `Task` — tarefas com prioridade e prazo.
- `Birthday` — aniversários; classificação etária calculada na API (CRIANCA 0–11, JOVEM 12–17, ADULTO 18+).
- `SessionRecord` — módulo Controle de Sessões (ver [MODULO-SESSOES.md](MODULO-SESSOES.md)).
- `VegetalLote` — estoque de vegetal.

## API REST

Prefixo `/api`. Autenticação: header `Authorization: Bearer <jwt>` (exceto `/auth/*`).

| Rota | Função |
|---|---|
| `POST /auth/register`, `POST /auth/login` | Cadastro (1º usuário vira ADMIN) e login |
| `GET/POST/PUT/DELETE /calendars` + `/:id/members` | Agendas e compartilhamento |
| `GET/POST/PUT/DELETE /events` | Eventos (`?from&to&q&calendarIds`; recorrências expandidas no GET) |
| `GET/POST/PUT/DELETE /tasks` | Tarefas |
| `GET/POST/PUT/DELETE /birthdays` | Aniversários (`?group=CRIANCA|JOVEM|ADULTO`) |
| `GET/POST/PUT/DELETE /sessions`, `GET /sessions/stats` | Controle de sessões e estatísticas |
| `GET/POST/PUT/DELETE /vegetal` | Estoque de vegetal |
| `GET /export/ics/:calendarId` | Exportação iCalendar (Google Agenda) |
| `GET|POST /export/json/:calendarId` | Backup / importação JSON |

## Modularidade

Cada módulo da API é um router isolado em `server/src/routes/`; cada módulo do app é uma tela em `app/app/`. Um módulo novo (ex.: Tesouraria) = novo model no `schema.prisma` + novo router + nova tela. Nada do núcleo precisa mudar.

## Integração com Google Agenda (futuro)

1. Curto prazo: exportação `.ics` já disponível (importável no Google Agenda).
2. Médio prazo: OAuth Google + Google Calendar API para sincronização bidirecional — adicionar um router `google-sync` que mapeie `Event.id` ↔ `googleEventId` (campo já pode ser adicionado por migração sem impacto).

## Publicação futura

- API: qualquer host Node (Railway, Render, VPS) + PostgreSQL.
- App: `eas build` para lojas (App Store / Play Store) e `npx expo export` para Web estática.
- Trocar `JWT_SECRET` por variável de ambiente forte e habilitar HTTPS.
