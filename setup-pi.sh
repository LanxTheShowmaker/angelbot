#!/usr/bin/env bash
# A.N.G.E.L. — Seraph • Raspberry Pi 5 8GB / 500GB • All-in-One Setup
# Branch: pi
# Usage: chmod +x setup-pi.sh && ./setup-pi.sh
# Handles: Node 20, deps, .env, Prisma, deploy, pm2/systemd

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
say() { echo -e "${CYAN}▸${NC} $1"; }
ok()  { echo -e "${GREEN}✓${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠${NC} $1"; }
die() { echo -e "${RED}✗${NC} $1"; exit 1; }

# --- 1. Checks ---
say "A.N.G.E.L. Pi 5 Setup — 8GB RAM / 500GB"
[ "$(id -u)" -eq 0 ] && warn "Running as root — OK for Pi, but prefer user with sudo."
if ! command -v git >/dev/null; then die "git not found — sudo apt install git"; fi

# Node >=20
if command -v node >/dev/null; then
  NODEV=$(node -v | sed 's/v//;s/\..*//')
  if [ "$NODEV" -lt 20 ]; then
    warn "Node $(node -v) <20 — will install Node 20 via NodeSource"
    NEED_NODE=1
  else
    ok "Node $(node -v) OK"
  fi
else
  NEED_NODE=1
  warn "Node not found — will install Node 20"
fi

if [ "${NEED_NODE:-0}" -eq 1 ]; then
  if command -v apt >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    ok "Node $(node -v) installed"
  else
    die "Install Node 20 manually: https://nodejs.org"
  fi
fi

# 8GB check (warn if <6GB)
MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEM_GB=$((MEM_KB/1024/1024))
[ "$MEM_GB" -lt 6 ] && warn "RAM ${MEM_GB}GB <8GB — heap will still be 4GB but may swap" || ok "RAM ${MEM_GB}GB"

# Disk check
DISK_FREE=$(df -BG . | awk 'NR==2{print $4}' | tr -d 'G')
[ "$DISK_FREE" -lt 10 ] && warn "Free ${DISK_FREE}GB — 500GB recommended, but will continue" || ok "Disk ${DISK_FREE}GB free"

# --- 2. Deps ---
say "Installing dependencies (npm ci)…"
if [ -f package-lock.json ]; then npm ci --omit=dev 2>&1 | tail -n 5; else npm install --omit=dev; fi
ok "deps installed"

# --- 3. Env ---
if [ ! -f .env ]; then
  if [ -f .env.example ]; then cp .env.example .env; warn "Created .env from .env.example — edit it next"; else die ".env.example missing"; fi
fi
# Prompt for token if still placeholder
if grep -q "your_bot_token\|your_application_id" .env; then
  echo ""
  say "Configure Discord credentials:"
  read -rp "DISCORD_TOKEN: " TOK
  read -rp "CLIENT_ID: " CID
  [ -n "$TOK" ] && sed -i "s|^DISCORD_TOKEN=.*|DISCORD_TOKEN=$TOK|" .env
  [ -n "$CID" ] && sed -i "s|^CLIENT_ID=.*|CLIENT_ID=$CID|" .env
  ok ".env updated"
fi
# Ensure DATABASE_URL for Pi (500GB NVMe)
if ! grep -q "DATABASE_URL" .env; then echo 'DATABASE_URL="file:./prisma/wings.db"' >> .env; fi

# --- 4. Prisma ---
say "Prisma generate + migrate deploy…"
npx prisma generate
npx prisma migrate deploy || npx prisma migrate dev --name init
ok "Prisma ready"

# --- 5. Deploy commands ---
if grep -q "DISCORD_TOKEN=.*\S" .env && grep -q "CLIENT_ID=.*\S" .env; then
  say "Deploying global commands (1h)…"
  node src/core/deploy.js || warn "Deploy failed — check DISCORD_TOKEN/CLIENT_ID"
else
  warn "Skipping deploy — DISCORD_TOKEN/CLIENT_ID empty in .env"
fi

# --- 6. Start ---
say "Pi 5 tuning: heap 4GB, WAL 64MB cache (src/core/services.js)"
if command -v pm2 >/dev/null; then
  say "Starting with pm2 (auto-restart, 4GB max)…"
  pm2 delete angel 2>/dev/null || true
  pm2 start src/core/bootstrap.js --name angel --node-args="--max-old-space-size=4096" --max-memory-restart 4G
  pm2 save
  pm2 startup -u $(whoami) --hp $(eval echo ~$(whoami)) 2>/dev/null || true
  ok "pm2: pm2 logs angel / pm2 status"
else
  warn "pm2 not installed — using systemd fallback or direct start"
  read -rp "Install pm2 globally? [Y/n] " P
  if [[ ! "$P" =~ ^[nN] ]]; then sudo npm i -g pm2 && pm2 start src/core/bootstrap.js --name angel --node-args="--max-old-space-size=4096" && pm2 save && ok "pm2 installed"; else
    say "Starting directly (foreground) — use Ctrl+C to stop, or run: npm run start:pi"
    node --max-old-space-size=4096 src/core/bootstrap.js
  fi
fi

ok "Done — A.N.G.E.L. Seraph should be online as A.N.G.E.L#0488"
say "Logs: pm2 logs angel  •  Deploy: node src/core/deploy.js -- --guild (instant)  •  Config: /autosetup + /setuptickets"
