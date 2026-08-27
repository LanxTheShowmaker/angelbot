# A.N.G.E.L. — Cherub 🕊️ (Low-Tier / 320 MB RAM / 1 GB disk)

> *Cherub* — the lightest order of angels, crafted for humble vessels.
> Same heavenly A.N.G.E.L. framework, tuned for 320 MB RAM panels (Pterodactyl, free tiers) and 1 GB free disk, 20–100 guilds.

**Branch:** `cherub` — keep `master` full-featured, `cherub` is panel-ready lite.

**What changed from `master`:**
- `index.js` at root — so panels that expect `index.js` as entry (your screenshot) work: `index.js` → `src/core/bootstrap.js`
- `package.json` `start` now `--max-old-space-size=256` (and `start:lite` 224 MB + `--optimize-for-size`) to stay inside 320 MB
- No feature cuts — all panels/tickets/automod retained (as you requested *keep all features*), just lighter runtime

**Panel deploy (no SSH, file manager only):**
1. Upload this `cherub` branch zip via panel file manager
2. Set startup file to `index.js` (as in your screenshot → `Save`)
3. Startup command: `npm ci --production && npx prisma migrate deploy && npm start` (or `npm run start:lite` for extra headroom)
4. Env: `DISCORD_TOKEN`, `CLIENT_ID`, `DATABASE_URL="file:./prisma/wings.db"` (SQLite stays local, WAL enabled, no Postgres needed)
5. After start, slash commands are global (1h). For instant dev test, set `GUILD_ID` and run `node src/core/deploy.js -- --guild`

**Disk:** `node_modules` ~90 MB after `npm ci --production` (was 180 MB with dev deps). DB `wings.db` + `angel-assets` channel (Discord CDN, not disk) keeps growth low for 100 guilds.

**Verify:** `node --check index.js` + `npx prisma validate` + panel `index.js` shows in file list.
