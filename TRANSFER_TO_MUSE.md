# Transfer to Muse — Atlas Handoff

Handoff for continuing development of **Atlas** on Meta Muse (Linux VM agent). Generated 2026-09-18. No follow-up questions should be needed.

## 1. Overview

Atlas ("AI Infrastructure Atlas") is a static, single-page explanatory web app that maps the AI-hardware / AI-infrastructure industry for a general-but-informed reader (analysts, journalists, curious technologists). It presents the ecosystem across seven navigable sections: a layered stack map, per-company KPIs, quarterly revenue & segments, a supply-chain map, a financing web (who funds whom), a timeline of key events, and a master glossary. All content is data-driven — every figure lives in JSON under `src/data/` and is rendered through React components; nothing is hardcoded in markup. A source-tier system tags each figure by confidence (reported / disclosed / estimated / inferred), plus an `unsourced` tier for roster companies whose financials are not yet sourced (shown as null + flagged, never invented). Charts use Recharts; the supply-chain and financing graphs are custom SVG. The design is fully responsive and supports light/dark mode via CSS design tokens. A hard rule throughout: financial figures are never fabricated — missing data stays null and is clearly flagged. The app is deployed as a static build (Vercel config present; GitHub Pages workflow also present).

## 2. Tech stack

- **Language:** JavaScript (JSX), plain ES modules — no TypeScript.
- **Framework:** React 18.3
- **Build tool:** Vite 5.4 (`type: module`)
- **Styling:** Tailwind CSS 3.4 + PostCSS 8.4 + Autoprefixer; design tokens as CSS vars in `src/styles/tokens.css`, mapped in `tailwind.config.js`.
- **Charts:** Recharts 2.15 (revenue); custom inline SVG (supply chain, financing).
- **Lint:** ESLint 9.39 (flat config) + react / react-hooks plugins.
- **Test:** Vitest 2.1 + @testing-library/react + jsdom (smoke tests).
- **Package manager:** npm (package-lock.json committed).
- **Node version:** CI uses **Node 20** (`.github/workflows/ci.yml`). Local dev was on Node 24.11 and works; target Node 20 LTS for parity.
- **Database:** None — fully static, all data in JSON files.
- **External services:** None at runtime. No APIs, no backend. Deploy targets: Vercel (`vercel.json`) and GitHub Pages (`.github/workflows/deploy.yml`).

## 3. Repo map (3 levels, excludes node_modules/.git/dist/build)

```
atlas/
├── .claude/
│   └── launch.json            # Claude Code dev-server config (npm run dev, port 5173)
├── .github/
│   └── workflows/
│       ├── ci.yml             # CI: validate + lint + test + build on push/PR to main
│       └── deploy.yml         # GitHub Pages deploy (builds with VITE_BASE=/<repo>/)
├── scripts/
│   └── validate-data.mjs      # Data-integrity gate; run by `npm run build` and CI
├── src/
│   ├── App.jsx                # Root component; maps section id → section component
│   ├── main.jsx               # React entry point (ReactDOM root)
│   ├── index.css              # Global styles + tier-chip rules; imports tokens.css
│   ├── components/
│   │   ├── common/            # Shared UI: SectionHeader, MetricCard, SourceTag,
│   │   │                      #   Filters, CompareToggle, GlossaryTerm, CompanyChip,
│   │   │                      #   CompanyBadge, CrossLinks, GuidedWalk, icons/
│   │   ├── glossary/          # GlossarySection.jsx (section 07, search + filters)
│   │   ├── kpis/              # CompanyKPIs.jsx (section 02, single/compare views)
│   │   ├── revenue/           # RevenueSegments.jsx (section 03, Recharts)
│   │   ├── supply-chain/      # SupplyChainMap.jsx (custom SVG)
│   │   ├── financing/         # FinancingWeb.jsx (custom SVG graph)
│   │   ├── layer-map/         # LayerMap.jsx (section 01, the stack)
│   │   └── timeline/          # TimelineHub.jsx (section events)
│   ├── data/                  # ALL content as JSON (see §8): companies, kpis,
│   │   │                      #   revenue, layers, supply-edges, financing, timeline,
│   │   │                      #   glossary, glossary-full, config
│   ├── lib/
│   │   ├── data.js            # Loads/normalizes JSON; getCompany, getGlossaryEntry, etc.
│   │   ├── appState.jsx       # App context: active section, company/glossary focus
│   │   ├── sections.js        # The 7 section definitions (id, num, label, color, blurb)
│   │   └── crosslinks.js      # Cross-section deep-link helpers
│   ├── styles/
│   │   └── tokens.css         # Design tokens (spacing/type/radius/color) light+dark
│   └── test/
│       ├── setup.js           # Vitest/jsdom setup
│       └── smoke.test.jsx     # Renders all sections
├── index.html                 # Vite HTML entry
├── vite.config.js             # Vite config; base from VITE_BASE env (default '/')
├── vitest.config.js           # Vitest config
├── eslint.config.js           # ESLint flat config
├── tailwind.config.js         # Tailwind theme mapped to CSS tokens
├── postcss.config.js          # PostCSS (tailwind + autoprefixer)
├── vercel.json                # Vercel static deploy (framework vite, SPA rewrites)
├── package.json / package-lock.json
├── ATLAS_BUILD_SPEC.md        # Full product/design spec (read first for intent)
├── VISION.md                  # Product vision
├── DEPLOY.md                  # Deploy instructions (Vercel + GitHub Pages)
├── MAINTENANCE.md             # How to add/update data safely
├── CHANGELOG.md               # Change history
└── .gitignore
```

## 4. Git state

```
$ git remote -v
origin  https://github.com/chronicmclan-beep/atlas.git (fetch)
origin  https://github.com/chronicmclan-beep/atlas.git (push)

$ git branch --show-current
main

$ git status --short
(clean — no uncommitted changes)

$ git log --oneline -5
e8a2911 extended revenue and KPIs to full company stack
5d5b198 added master glossary section
423a377 fixed text overlap and formatting bugs
1336329 six section icons integrated
ca87107 bigger sidebar nav + financing graph fills width
```

> Note: this handoff file (`TRANSFER_TO_MUSE.md`) is new and untracked until committed.

## 5. Setup & run (from scratch)

```bash
# 1. Clone
git clone https://github.com/chronicmclan-beep/atlas.git
cd atlas

# 2. Install (Node 20 LTS recommended for CI parity)
npm ci          # use `npm install` if package-lock is out of sync

# 3. Dev server (http://localhost:5173)
npm run dev

# 4. Validate data files (integrity gate)
npm run validate

# 5. Lint
npm run lint

# 6. Tests (smoke: all sections render)
npm test

# 7. Production build (runs validate first, then vite build → dist/)
npm run build

# 8. Preview the built output
npm run preview
```

**Windows-specific things to translate for Linux:** None material. The project itself is OS-agnostic (no shell scripts, no hardcoded Windows paths in source, no CRLF-dependent tooling; `.gitignore` doesn't force line endings). The only Windows artifacts are outside the app: `.claude/launch.json` (Claude Code desktop config — Muse can ignore it and just run `npm run dev`) and any local `.claude/settings.local.json` (gitignored, not transferred). Recommend adding a `.gitattributes` with `* text=auto eol=lf` if you want to guarantee LF on the Linux side, but nothing currently breaks without it.

## 6. Environment

No `.env` file exists and none is required for local dev, build, or test. No `.env.example` template exists. The app has **no secrets, keys, tokens, or passwords** — it is a static site with no backend or external API.

The only environment variable referenced anywhere:

- **`VITE_BASE`** — optional; the public base path for the build (`vite.config.js`, default `'/'`). Set to `/<repo>/` only when deploying to a GitHub Pages project page so asset URLs resolve. The GitHub Pages workflow sets it automatically to `/${repo-name}/`. Not needed for Vercel or local dev. Value: not a secret (a URL path). No `<REDACTED>` values apply because there are no secret vars.

## 7. Current state

**Working (verified: validate + lint + build green, tested light/dark at 375 / 1280 / 1920 px):**
- All 7 sections render and are navigable: Layer Map, Company KPIs, Revenue & Segments, Supply Chain, Financing Web, Timeline, Glossary.
- Text-overlap / formatting audit complete — no overlap, clipping, or overflow across the tested widths and both themes (commit 423a377).
- Master Glossary (section 07) with search, type filters (terms / people & players / products / events), live counts, and deep-linking from tap-to-learn popovers (commit 5d5b198).
- Revenue & KPIs extended to the full company stack — hyperscalers (MSFT, AMZN, GOOGL, Meta, Oracle) + neocloud (CoreWeave) added alongside the six chip designers, with an `unsourced` tier for figures not yet sourced (commit e8a2911).

**Known issues / hacks / accepted trade-offs:**
- **Financing web dense view:** in the most-connected node selections, a truncated amount label can sit adjacent to a node. Kept legible via an SVG "halo" (`paintOrder="stroke"`) and on-graph truncation; full text is always in the hover title / inspector. Fully clean layout would require a force-directed engine — accepted as standard dense-graph treatment, not a bug.
- **`unsourced` source tier:** hyperscaler/neocloud financials in `kpis.json` and `revenue.json` are intentionally `null` and flagged (`unsourced: true`), never invented. This is an absence-of-data state, deliberately added alongside the four confidence tiers. Populating real sourced figures later requires **no code changes** — just fill the JSON.
- No Windows-only hacks in the codebase.

**Next TODOs (priority order):**
1. **Source & fill hyperscaler / neocloud financials** — replace the `null` + `unsourced` placeholders in `kpis.json` and `revenue.json` (MSFT, AMZN, GOOGL, Meta, Oracle, CRWV) with figures from primary filings, tagging each with the correct real source tier. **Never fabricate — leave unsourced until verified.**
2. **Port remaining revenue series** — `revenue.json` note flags Marvell and Arm quarterly series as still to be added; Broadcom's most recent two calendar quarters are flagged for re-verification against its Nov fiscal year-end.
3. **Revisit financing dense-view labels** — consider a force-directed / collision-aware label layout if the dense selections become a priority.
4. **Expand glossary coverage** as new terms/players/products/events enter the other sections; keep every entry sourced where a figure is quoted.
5. **Confirm deploy target** — both Vercel (`vercel.json`) and GitHub Pages (`deploy.yml`) configs exist; pick one canonical target to avoid drift.

## 8. Data & services

- **Database:** None. All content is static JSON in `src/data/`, loaded and normalized by `src/lib/data.js`.
- **Data files:**
  - `companies.json` — company roster (name, ticker, color, role, layer).
  - `kpis.json` — per-company KPI/metric records (with source tier per figure; `unsourced` records for un-sourced companies).
  - `revenue.json` — quarterly total revenue series (US$ B), 18 quarters `Q1'22`–`Q2'26`, nulls for gaps.
  - `layers.json` — the stack layers for the Layer Map.
  - `supply-edges.json` — supply-chain graph edges.
  - `financing.json` — financing-web nodes/edges (who funds whom, amounts).
  - `timeline.json` — dated events.
  - `glossary.json` — original term → definition map.
  - `glossary-full.json` — master glossary (48 entries: types = term / player / product / event; each with plain-language definition + source where relevant).
  - `config.json` — source-tier definitions (reported / disclosed / estimated / inferred / unsourced) and app config.
- **Schema / migrations:** No migrations. Structural integrity enforced by `scripts/validate-data.mjs` (run by `npm run build` and CI) — e.g. every tier must exist in `config.sourceTiers` (+ `live`), revenue arrays must match the quarters length (18). Run `npm run validate` after any data edit.
- **Seed data:** N/A (the JSON files *are* the content).
- **External APIs / background jobs:** None. No live data feeds (explicitly out of scope for the current build).
- **Ports:** Dev server **5173** (Vite default; also set in `.claude/launch.json`). Preview server uses Vite's preview port (4173 by default).

---

## Where to point Muse

**(a) Git remote URL to share with Muse:**

```
https://github.com/chronicmclan-beep/atlas.git
```

The repo is clean and fully pushed to `origin/main` (latest commit `e8a2911`). Muse can clone directly — no zip needed. (Commit this `TRANSFER_TO_MUSE.md` and push it first so Muse gets the handoff in-repo.)

**(b) If uploading a zip instead:** zip the `atlas/` folder **excluding** `node_modules/`, `.git/`, `dist/`, `dist-ssr/`, `build/`, `.vite/`, and any `*.local` files. Everything else (all of `src/`, the root config files, the `.md` docs, `scripts/`, `.github/`) is required.
