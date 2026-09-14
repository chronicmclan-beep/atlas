# Deploying the AI Infrastructure Atlas

The app is a fully static site — `vite build` emits `dist/` (HTML, CSS, JS, and the
JSON data baked in). No backend, no environment secrets. Host `dist/` anywhere that
serves static files.

## Build locally

```bash
npm install
npm run build      # outputs dist/
npm run preview    # serve the built dist/ at http://localhost:4173 to check it
```

## Option A — Vercel (simplest)

Vercel auto-detects Vite; [vercel.json](vercel.json) pins the settings explicitly.

1. Push this project to a Git repo (its root should be this folder — `package.json`
   at the root).
2. In Vercel, "Add New → Project" and import the repo.
3. Accept the detected settings (build `vite build`, output `dist`) and deploy.

The base path stays `/` — nothing else to configure.

## Option B — GitHub Pages (automated)

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds and publishes on
every push to `main`.

1. Push this project to GitHub (repo root = this folder).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow builds with `VITE_BASE=/<repo>/` (so assets resolve
   under the project-page subpath) and deploys. The live URL appears in the workflow's
   "deploy" job summary.

### Base path note

- Vercel, a custom domain, or a **user/org** page (`<user>.github.io`) → base `/`
  (the default). Nothing to set.
- A GitHub **project** page (`<user>.github.io/<repo>/`) → base must be `/<repo>/`.
  The workflow sets this automatically; for a manual build run
  `VITE_BASE=/<repo>/ npm run build`.

## Deferred (per the build spec)

Live market data, real company logos, and animations are intentionally not included in
this v1 build. Market-cap / P-E metrics render as "—" with a "needs live feed" note
until a data source is wired up.
