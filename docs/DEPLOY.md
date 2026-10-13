# Deploy

Two Vercel projects in the team `numerix`, plus an optional Render alternative for the mock.

| Project | Folder | Live URL | What it is |
|---|---|---|---|
| `numerix-web` | repo root | https://numerix-web-snowy.vercel.app | The Next.js app |
| `numerix-mock` | `mock/` | https://numerix-mock.vercel.app | The mock backend (a Node function that serves the contract mappings and keeps demo data in the browser's cookie) |

## Deploy the app

```bash
pnpm vercel:env diff production      # compare config/env/production.env with Vercel
pnpm vercel:env push production      # push the variables (non secret) if they differ
npx vercel deploy --prod --yes       # from the repo root
```

`vercel.ts` holds the Vercel settings (region `yul1`, security headers, cache rules). Variables live in `config/env/<environment>.env` and every one is documented in `.env.example`. `npx vercel env pull .env.local --environment=development --yes` brings the development variables to your machine.

## Deploy the mock

```bash
cd mock
npm run sync            # regenerates the mappings from contracts/ and bundles them
npx vercel deploy --prod --yes
node scripts/selftest.mjs https://numerix-mock.vercel.app   # must print "all good"
```

The app's `API_URL` points at `https://numerix-mock.vercel.app/v1`. Demo data (children, PINs, consent, likes) travels in a cookie, so it survives cold starts and is private to each browser. The keep-alive job (`.github/workflows/keepalive.yml`, also `node scripts/keepalive.mjs`) pings both projects every 5 minutes so the first request is never slow.

## Connect GitHub so every push deploys

Vercel can only import repositories its GitHub app can see. If `numerix-web` is missing from the list (you only see other repositories):

1. GitHub, **Settings, Applications, Installed GitHub Apps, Vercel, Configure**.
2. Under **Repository access**, choose **Only select repositories** and add `Perrin-Nj/numerix-web` (or **All repositories**). Save.
3. Vercel, project `numerix-web`, **Settings, Git, Connect Git Repository**, pick `Perrin-Nj/numerix-web`, branch `main`.

For the mock, set the project's **Root Directory** to `mock` before connecting.

Until then, deploy with the CLI as above.

## Deploy the mock on Render instead (optional)

Use this if you prefer the real WireMock engine, which runs in Docker and not on Vercel.

1. Push the repository to GitHub (done).
2. On render.com: **New, Blueprint**, connect `Perrin-Nj/numerix-web`. Render reads `render.yaml`, builds `contracts/wiremock/Dockerfile` (WireMock plus the generated mappings) and starts a free web service named `numerix-mock`.
3. Wait for the deploy, then open `https://<your-service>.onrender.com/__admin/health`.
4. Set `API_URL=https://<your-service>.onrender.com/v1` in `config/env/production.env`, run `pnpm vercel:env push production`, redeploy the app.

Notes: the Render free tier sleeps when idle, so the keep-alive job must ping it too. The pure WireMock engine does not have the stateful profile and feed behavior of the Node mock (children, PINs, consent, feed); it serves the static contract only.

## When something is wrong

| Symptom | Check |
|---|---|
| App shows "Le problème vient de nous" | `curl https://numerix-web-snowy.vercel.app/api/health`: `backend` must be `ok`. If not, check the mock URL. |
| `DEPLOYMENT_NOT_FOUND` | The project was deleted or relinked. `npx vercel project ls --scope numerix`, then `npx vercel link --yes --scope numerix --project numerix-web` and redeploy. |
| Variables differ | `pnpm vercel:env diff production` |
| New mock behavior not live | `cd mock && npm run sync`, redeploy the mock, run the self test |
