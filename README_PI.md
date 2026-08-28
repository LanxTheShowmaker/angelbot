# A.N.G.E.L. — Seraph ⚡ (Raspberry Pi 5 • 8 GB RAM • 500 GB)

> *Seraph* — highest order, for vessels with power to spare.
> Same heavenly framework, unleashed for Pi 5 8GB with 500GB storage.

**Branch:** `pi` — optimized for Raspberry Pi 5 (ARM64, 8GB, 500GB NVMe/SD).

**Why Pi 5 8GB is ideal:**
- 8GB RAM → heap 4GB (`--max-old-space-size=4096`), keep all features, 100+ guilds easily
- 500GB → retain transcripts, logs, `angel-assets` without pruning; SQLite WAL 64MB cache

**What changed from `master`:**
- `package.json` `start` now `--max-old-space-size=4096` (Pi full), `start:lite` 256 retained for fallback
- SQLite: `PRAGMA cache_size=-64000` (64MB), `journal_mode=WAL`, `busy_timeout 5000`, `synchronous=NORMAL` — max throughput for 500GB disk
- No feature cuts — Orders/Assistance/Regulations/Dashboard + automod + fortress all enabled
- Recommended: run via `pm2` or `systemd` with auto-restart; `npm ci && npx prisma migrate deploy && npm start`

**Pi deploy:**
```bash
git clone -b pi https://github.com/LanxTheShowmaker/angelbot angel-pi
cd angel-pi
npm ci
cp .env.example .env  # set DISCORD_TOKEN, CLIENT_ID
npx prisma migrate deploy
npm run start:pi
# or pm2: pm2 start src/core/bootstrap.js --name angel --max-memory-restart 4G
```

**SD longevity:** WAL on 500GB NVMe is fine; add `PRAGMA temp_store=MEMORY` already via services.

**Verify:** `node --check src/core/bootstrap.js` + `prisma validate` + panel `index.js` not needed (Pi runs via `src/core/bootstrap.js` directly).
