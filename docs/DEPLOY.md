# Deploy

Two Vercel projects in the team `numerix`. GitHub is linked: a push to `main` deploys the web app and the admin app by itself. The Go API (`../numerix-api`) runs on an Oracle Cloud Always Free VM (Ubuntu, Caddy for HTTPS, SQLite on disk, Litestream backups); the steps are summarised in section 1 and detailed in `../numerix-api/docs/DEPLOY_ORACLE.md`.

| Project | Folder | Live URL | What it is |
|---|---|---|---|
| `numerix-web` | repo root | https://numerix-web-snowy.vercel.app | The Next.js kid and parent app |
| `numerix-admin` | `admin/` | https://numerix-admin.vercel.app | The super-admin app (separate server, own login) |

Deploy order when several change: **Go API (and its content seed), then admin, then web** (the admin and the web app both call the Go API). The checklist of what must be true before merging to `main` is `../numerix-api/docs/RELEASE_CHECKLIST.md`.

## One-time setup

```bash
npm i -g vercel                 # or use npx vercel everywhere
npx vercel login                # account njietchewandji-2671, team numerix
```

Each folder is already linked (`.vercel/` is git-ignored). To relink: `npx vercel link --yes --project <name> --scope numerix` inside the folder.

## Production deploy, step by step

Run from the repo root `Services/frontend`. Every command is safe to rerun.

### 0. Gate: everything green locally

```bash
pnpm install
pnpm check                      # stories, copy (fr-CA and en-CA parity), sounds, typecheck, lint
bash scripts/test.sh arch       # layer arrows and documentation coverage
bash scripts/test.sh            # state, contract, flows, ui, errors, mobile (starts the servers it needs)
SEED_CONTENT=1 bash scripts/test.sh play   # world map, journeys, every question kind (loads the question bank)
(cd admin && npm install && npm test)      # starts its own Go API on a fresh database with the question bank
```

### 1. Go API (Oracle VM) and its content

The API is one static binary (`GOARCH=arm64` for the Ampere VM) with SQLite on the VM disk. Full walkthrough: `../numerix-api/docs/DEPLOY_ORACLE.md`. Short version, from `../numerix-api`:

```bash
bash deploy/oracle/deploy.sh ubuntu@<vm-ip> arm64     # build, copy, restart (about 10 s of downtime)
curl -s https://<api-host>/v1/health                  # {"status":"ok",...}
```

Production needs `APP_ENV=production`, `JWT_SECRET`, `ADMIN_API_TOKEN` (16+ random chars, the same value as the admin project's), `DB_PATH`, `ALLOWED_ORIGINS` (the web origin), `ADMIN_ORIGIN`, `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGINS` (set in `/etc/numerix/api.env`, never committed). Never run `scripts/seed-dev.mjs` against it.

**Seeding the question bank in production** (1229 questions, 89 quests, 20 worlds with hero pictures, 193 assets). It is a separate, repeatable step: a deploy of the binary does not change content. On the VM, from the API folder:

```bash
bash scripts/db-prod-deploy.sh                  # validate + dry run: shows added/changed/unchanged, writes nothing
bash scripts/db-prod-deploy.sh --apply          # backup (VACUUM INTO), migrate, write only what changed
bash scripts/db-prod-deploy.sh --rollback <run_id>
```

Run the dry run first and read the counts. The first run on an empty database adds everything; later runs only apply edits. The demo file `_examples.json` is never loaded. The API sees new content within 30 s. Details and rollback: `../numerix-api/docs/DB_PROD_DEPLOY.md`.

**Picture files.** The browser asks the web origin for `/assets/...`; `next.config.ts` rewrites that to `$API_URL/assets/...`, so the Go API stays the single source of the bytes. Every asset URL is content-addressed and the API answers `Cache-Control: public, max-age=31536000, immutable` with an `ETag` (and 304 on revalidation); the rewrite forwards those headers, so the browser and the Vercel CDN cache each picture after the first request and a picture change gets a new URL. Check after a deploy: `curl -sI https://<web-host>/assets/<file> | grep -i -E "cache-control|etag"`.

**Variables that point at the API**

| Where | Variable | Value |
|---|---|---|
| Vercel `numerix-web` (`config/env/production.env`) | `API_URL` | `https://<api-host>/v1` (with `/v1`; also the target of the `/assets` rewrite) |
| Vercel `numerix-admin` | `PLATFORM_API_URL` | `https://<api-host>` (no `/v1`) |
| Vercel `numerix-admin` and the VM | `ADMIN_API_TOKEN` | the same secret on both; it stays on servers and never reaches a browser |

### 2. Admin app

Pushed to `main`, it deploys by itself. For a manual deploy, run from the repo root (not from `admin/`: the project's Root Directory is already `admin`, so deploying from inside it fails with "Specified Root Directory 'admin' does not exist"):

```bash
VERCEL_PROJECT_ID=prj_VJl4ApawwzIYaXhRJnVIrr9C6MUt VERCEL_ORG_ID=team_T5J20u7m9gfOfoKOpBYdYG3q vercel deploy --prod --yes
```

Use the global `vercel` (`npx vercel` can fail with ECOMPROMISED). Production env vars on `numerix-admin` (set once, inside `admin/`):

| Var | Value |
|-----|-------|
| `ADMIN_PASSWORD` | the super-admin password (8+ chars, long and random) |
| `ADMIN_SESSION_SECRET` | 32+ random chars: `openssl rand -hex 32` |
| `PLATFORM_API_URL` | the Go API base URL, no `/v1` |
| `ADMIN_API_TOKEN` | same value as on the Go API |

Rotate the password: `printf '%s' 'new-password' | npx vercel env add ADMIN_PASSWORD production --force`, then redeploy.

### 3. Web app

```bash
pnpm vercel:env diff production      # compare config/env/production.env with Vercel
pnpm vercel:env push production      # push non-secret variables if they differ
npx vercel deploy --prod --yes
```

Three UI switches are off by default and only hide UI (the server gate stays): `NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI` (trial badge, subscription card), `NEXT_PUBLIC_FEATURE_WELCOME_GIFT` (first-visit gift only), `NEXT_PUBLIC_SHOW_DEMO_BADGE` (demo data badge). Set one to `true` in `config/env/production.env`, push the env, redeploy.

`vercel.ts` holds the Vercel settings (region `yul1`, security headers, cache rules). Variables live in `config/env/<environment>.env`, each documented in `.env.example`. After relinking or recreating the project, run `pnpm vercel:env push production|preview|development` again (variables vanish with the project).

### 4. Verify production

```bash
bash scripts/test.sh live        # flows, ui and error checks against numerix-web-snowy.vercel.app
curl -s https://numerix-web-snowy.vercel.app/api/health
curl -s https://<go-api-host>/v1/health
curl -s -o /dev/null -w "%{http_code}\n" https://numerix-admin.vercel.app/login          # 200

```

Then open https://numerix-admin.vercel.app/login and sign in.

### Rollback

```bash
npx vercel ls                               # find the previous good deployment URL
npx vercel promote <deployment-url>         # or: npx vercel rollback
```

Run it inside the folder of the project to roll back.

## Connect GitHub to Vercel (done for web and admin; only needed again for a new project)

In GitHub: Settings, Applications, Vercel, Configure, add the repository. Then in Vercel for each project: Settings, Git, Connect Git Repository.

## Keep-alive

`.github/workflows/keepalive.yml` (also `node scripts/keepalive.mjs`) pings the projects every 5 minutes so the first request is never slow. It starts running once the PR is merged to `main`.

