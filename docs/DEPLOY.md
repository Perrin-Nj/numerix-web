# Deploy

Three Vercel projects in the team `numerix`. GitHub is linked: a push to `main` deploys the web app and the admin app by itself. The mock is not auto-deployed (its folder is not the Git root of a project), so deploy it by hand with the CLI when `mock/` changes.

| Project | Folder | Live URL | What it is |
|---|---|---|---|
| `numerix-web` | repo root | https://numerix-web-snowy.vercel.app | The Next.js kid and parent app |
| `numerix-admin` | `admin/` | https://numerix-admin.vercel.app | The super-admin app (separate server, own login) |
| `numerix-mock` | `mock/` | https://numerix-mock.vercel.app | The platform and mock backend (contract mappings, subscriptions, admin API) |

Deploy order when several change: **mock, then admin, then web** (the admin and the web app both call the mock).

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
pnpm typecheck && pnpm lint && pnpm check:stories && pnpm check:copy
node scripts/check-architecture.mjs && node scripts/check-docs.mjs
bash scripts/test.sh            # state, contract, mock, flows, ui, errors, mobile (starts the servers it needs)
(cd admin && npm install && npm test)
```

### 1. Mock (platform API)

```bash
cd mock
npm run sync                                    # regenerate and bundle the mappings
npx vercel deploy --prod --yes
node scripts/selftest.mjs https://numerix-mock.vercel.app     # must print "all good"
cd ..
```

Production env vars on this project (set once, `npx vercel env add NAME production` inside `mock/`):

| Var | Value |
|-----|-------|
| `ADMIN_API_TOKEN` | long random string, same as the admin project's. Without it the admin API refuses everything. |
| `ADMIN_ORIGIN` | `https://numerix-admin.vercel.app` (CORS for the admin app) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional. Adds the Upstash Redis integration so admin changes survive cold starts and reach the kid app live. Without them platform data is in memory and resets. |

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
| `PLATFORM_API_URL` | `https://numerix-mock.vercel.app` |
| `ADMIN_API_TOKEN` | same value as on the mock project |

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
curl -s https://numerix-mock.vercel.app/__admin/health
curl -s -o /dev/null -w "%{http_code}\n" https://numerix-admin.vercel.app/login          # 200
curl -s -o /dev/null -w "%{http_code}\n" https://numerix-mock.vercel.app/admin/v1/overview   # 401 without the token
```

Then open https://numerix-admin.vercel.app/login and sign in.

### Rollback

```bash
npx vercel ls                               # find the previous good deployment URL
npx vercel promote <deployment-url>         # or: npx vercel rollback
```

Run it inside the folder of the project to roll back.

## Connect GitHub to Vercel (done for web and admin; only needed again for a new project)

In GitHub: Settings, Applications, Vercel, Configure, add the repository. Then in Vercel for each project: Settings, Git, Connect Git Repository. Set the root directory to `.` (web), `admin` (admin) and `mock` (mock).

## Keep-alive

`.github/workflows/keepalive.yml` (also `node scripts/keepalive.mjs`) pings the projects every 5 minutes so the first request is never slow. It starts running once the PR is merged to `main`.

## Alternative host for the mock

`render.yaml` plus `contracts/wiremock/Dockerfile` run the pure contract mock (no subscriptions or admin API) on Render. Not used in production.
