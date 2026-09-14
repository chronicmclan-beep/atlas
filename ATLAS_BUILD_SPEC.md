# AI Infrastructure Atlas — Build Specification

Living build plan. The app is a renderer over the JSON files in src/data. Adding a company, figure, deal, or event = editing JSON, never touching component code.

## Objective
An interactive web app mapping the full AI buildout — the physical supply chain from raw materials to finished models, plus the capital flows on top of it. Governing rule: every figure is sourced and tagged by confidence (reported / disclosed / estimated / inferred), and commitments are tagged realized:false and never mixed with booked figures. Static site, no backend in v1.

## Tech stack
- Vite + React + Tailwind CSS. Plain JavaScript is fine.
- Data: the nine flat JSON files already in the atlas-data folder (move them to src/data).
- Charts: Recharts for revenue bars; custom SVG/HTML for the supply-chain graph, timeline, and financing web.
- Deploy target: static build, Vercel or GitHub Pages (later).

## Folder structure

Folder structure — inside atlas/:
- src/data/ holds the 9 JSON files (config, layers, companies, kpis, revenue, supply-edges, financing, timeline, glossary). Move them here from atlas-data.
- src/components/ with one subfolder per section: layer-map, kpis, revenue, supply-chain, timeline, financing — plus a common/ subfolder for shared components (SourceTag, MetricCard, CompareToggle, Filters, GuidedWalk).
- src/lib/ for data loaders, the cross-link registry, and helpers.
- src/styles/ for design tokens.
- src/App.jsx and src/main.jsx at the root of src.
- index.html at the root of atlas.

## Design tokens
- Company colors live in companies.json (each company has a "color").
- Source-tier styles: reported = green, disclosed = blue/accent, estimated = amber, inferred = gray. Realized = solid line, committed = dashed line.
- Timeline category colors and eras live in config.json.
- Two font weights only (400 regular, 500 medium). Sentence case everywhere. Flat and minimal — no heavy shadows or gradients.

## The six sections (the nav shell needs these six, in this order)
1. Layer Map — the 9 layers as cards from layers.json; clicking a layer sets the active company set.
2. Company KPIs — financials per company from kpis.json, with a single view, a compare lens, and tap-to-learn definitions from glossary.json; every metric shows its source tier.
3. Revenue & Segments — quarterly revenue charts from revenue.json; compare mode and an indexed view.
4. Supply Chain Map — the interactive food-web from supply-edges.json + companies.json; guided walk then free explore; tap a company for its info.
5. Master Timeline — horizontal scrollable hub from timeline.json; eras, major/minor tiers, filters, and event detail that links to the companies involved.
6. Financing Web — capital-flow graph from financing.json; a circular-loops view and a full-web view; realized solid, committed dashed.

## Cross-cutting systems (build once, reuse)
A SourceTag component; a shared glossary powering tap-to-learn; a GuidedWalk stepper; a cross-link registry so a company referenced anywhere links to its KPI card and supply-chain node.

## Build phases
- Phase 0 scaffold + tokens + empty nav shell.
- Phase 1 move JSON to src/data + loaders.
- Phase 2 shared components.
- Phase 3 sections one at a time in the order above.
- Phase 4 cross-linking.
- Phase 5 polish (animations, logos, responsive, live data).
- Phase 6 deploy.

## Deferred
Live market data, real logos, animations, a reworked magnitude view. AVGO's last two quarterly revenue points need re-verification. Non-chip-design financials still to be sourced.
