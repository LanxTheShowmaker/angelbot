# WINGS

A bespoke, premium Discord application built for a single private server. WINGS is designed to feel intentional: consistent visual language, fast slash commands, a unified case system for moderation, structured logging, and graceful failure handling.

## Principles

- Slash-first. Components (buttons, selects, modals) are used only when they improve usability.
- Every response follows one design system (`src/design`).
- Sensible confirmation for destructive actions; ephemeral by default for moderation.
- No raw Discord/DB errors reach ordinary users.
- Persistent state lives in Postgres via Prisma — never scattered JSON.

## Stack

- Plain JavaScript (ESM), run with `node`
- `discord.js@14`
- `Prisma` + SQLite (local file — no server or Docker required)

## Project structure

```
src/
  core/      bootstrap, client, command+event registry, services container, logger, permissions
  design/    theme + embed/component design system (the "interface")
  store/     prisma client
  services/  business logic: settings, cases, moderation, logging, automod, orders, fortress, utility
  commands/  slash commands grouped by module (auto-loaded)
  events/    discord event handlers (auto-loaded)
tests/       vitest specs
prisma/      schema + migrations
```

Commands and events are auto-discovered. A command file exports:

```ts
export default {
  data: new SlashCommandBuilder().setName("example").setDescription("..."),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction) { /* ... */ },
};
```

Inside a command, reach services via `const client = interaction.client as WingsClient; client.services.<name>`.

## Setup (development)

```bash
cp .env.example .env            # fill DISCORD_TOKEN, CLIENT_ID (DATABASE_URL is already set to a local SQLite file)
npm install
npx prisma generate
npx prisma migrate dev          # creates the local wings.db file
npm run dev
```

Register slash commands (guild-scoped for speed):

```bash
npm run deploy
```

The commands are plain `.js` files under `src/commands` — edit and restart (or use `npm run dev` for auto-reload).

## Production

```bash
npm ci
npx prisma migrate deploy
npm run start
```

The bot needs the `Guilds`, `GuildMembers`, `GuildMessages`, `GuildBans`, `MessageContent`, and `GuildVoiceStates` intents and the `bot` + `applications.commands` scopes. For moderation it needs `Ban Members`, `Kick Members`, `Moderate Members`, `Manage Channels`, and `Manage Messages`.

## Quality

The project is plain ESM JavaScript. Lint/format/testing tooling can be added
later (e.g. ESLint, Prettier, Vitest) if desired; the runtime depends only on
`node`, `discord.js`, and `Prisma`.

## Feature set

- **Moderation + Cases** — ban, kick, timeout, warn, note; every action opens a numbered case with target/moderator/reason/duration. `/case view|resolve|user|moderator`.
- **Logging** — message edits/deletes, joins/leaves, role changes to configured channels.
- **Automod (deep)** — spam, mention spam, invite/link filtering, **new-account link lockdown**, zalgo & emoji-spam, scam-URL blocking, multi-user **cluster spam**, raid/join-spike detection, per-channel exemptions, offense escalation ladder, and **auto-fortress** on raid.
- **Design Orders** — `/order panel` → category → brief modal (description, budget, deadline, references) → private channel with a live status pipeline (`Brief → Claimed → In Progress → Review → Revision → Delivered → Paid → Closed`), designer claim, add/remove users, and transcript export. `/order list` shows the production board; `/order categories` manages design types.
- **Fortress / lockdown** — `/fortress enable` snapshots and locks every channel to staff only (restored on `/fortress disable`), with status and auto-trigger during raids.
- **Utility** — whois, avatar, serverinfo, poll, reminder, purge, slowmode.
- **Settings** — `/settings` with progressive categories (logging, welcome, moderation, orders, automod, general).

WINGS is purpose-built for a design/commission server: the ticket system is replaced by the order system, and moderation is hardened for raids and scam defense.
