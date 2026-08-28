# A.N.G.E.L. Branches

> `master` → **FULL SELF-HOSTED**
> `cherub` → **ULTRA-LIGHT / LOW-RESOURCE**
> `seraph` → **DIY AT HOME**

This document clarifies the three canonical branches. `seraph` is the **only** name for the DIY-at-home branch — `pi` is **not** a branch. `Pi` refers only to Raspberry Pi-specific deployment documentation/configuration.

---

## Branch Identities

### 1. `master` — Full Self-Hosted Production
- **Complete** version with all features and services enabled.
- General-purpose, hardware-agnostic.
- For users who control their own server environment.
- **Primary / full release.**
- Command count: 38+ (all panels, tickets, automod, leveling, economy, etc.)
- Heap: default (Pi tuning not applied)
- Entry: `src/core/bootstrap.js` (`npm start`)

### 2. `cherub` — Ultra-Light / Low-Resource
- For constrained hosting: low-RAM Pterodactyl panels, budget/free hosts.
- **320 MB RAM / 1 GB disk** target.
- Low RAM, low disk, efficient runtime.
- Preserves *Cherub* identity (lightest order).
- Optimizations: `index.js` entry for panels expecting `index.js`, `package.json:start --max-old-space-size=256` (`start:lite` 224), no heavy extras.
- Same features as `master`, but runtime tuned down.

### 3. `seraph` — DIY at Home
- For people who host Wings themselves on own hardware at home.
- **Raspberry Pi 5 is a major supported target, but Seraph is NOT named "pi".**
- Also runs on mini PCs, desktops, NAS, etc.
- General home-server, not Pi-only.
- Includes home-server docs: `README_PI.md` (Pi 5 8GB/500GB example), `setup-pi.sh` (Pi all-in-one), `package.json:start:seraph` / `start:pi` (Pi heap 4GB).
- Optimizations: `PRAGMA cache_size=-64000` (64MB), `mmap 256MB`, `heap 4096`.

---

## What Differs (Hosting Adaptation, Not Features)

| Area | `master` | `cherub` | `seraph` |
|------|----------|----------|----------|
| **Purpose** | FULL SELF-HOSTED | ULTRA-LIGHT | DIY AT HOME |
| **RAM** | default | 256 MB | 4096 MB |
| **Disk** | default | pruned, 1GB free | 500GB NVMe, retains transcripts |
| **Entry** | `src/core/bootstrap.js` | `index.js` → `bootstrap.js` | `src/core/bootstrap.js` (`start:seraph` / `start:pi`) |
| **DB cache** | WAL, 5s busy | WAL, 5s busy | WAL 64MB, mmap 256MB, temp MEMORY |
| **Docs** | `README.md` | `README_CHERUB.md` | `README_PI.md`, `setup-pi.sh` |

**All three share the same 38+ features** — no feature cuts. Differences are *only* for lower-tiered systems / hosting sites with low resources (`cherub`) vs home hardware (`seraph`).

---

## Cloning

```bash
# Full
git clone -b master https://github.com/LanxTheShowmaker/angelbot
# Low-resource
git clone -b cherub https://github.com/LanxTheShowmaker/angelbot
# DIY at home (Pi 5 example included)
git clone -b seraph https://github.com/LanxTheShowmaker/angelbot
```
