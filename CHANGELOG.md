# Changelog

A plain-language record of what has been built and changed, newest at the top.
Each entry is a point you could safely roll back to.

## 2026-09-14 — Initial working version

The first complete version of the AI Infrastructure Atlas: an interactive site
that maps the AI hardware buildout, built as a renderer over flat JSON data
(adding a company, figure, deal, or event means editing JSON, not code).

### The data
- Nine JSON data files in `src/data/`: config, layers, companies, kpis, revenue,
  supply-edges, financing, timeline, glossary.
- Every figure is tagged by source confidence — **reported**, **disclosed**,
  **estimated**, or **inferred** — and commitments are marked separately from
  booked figures (realized vs. committed).

### The six sections
1. **Layer map** — the nine layers of the supply chain; clicking a layer shows
   its companies.
2. **Company KPIs** — per-company financials with a single and a compare view,
   tap-to-learn definitions, and a source tier on every figure.
3. **Revenue & segments** — quarterly revenue charts with compare and indexed views.
4. **Supply chain map** — an interactive "food-web" of who supplies whom, with a
   guided walk and free exploration.
5. **Master timeline** — a scrollable history grouped into eras, with filters and
   event detail.
6. **Financing web** — capital flows, with a circular-loops view and a full-web
   view; realized flows solid, committed flows dashed.

### Cross-cutting
- Shared components (source tags, metric cards, filters, guided walk, glossary).
- Cross-linking: a company referenced anywhere links to its KPI card, supply-chain
  node, and financing node.

### Visual design
- A shared design-token system (one spacing scale, one type scale, consistent
  radii and borders) that every section reads from.
- Two font weights, sentence case, flat and minimal, with the source-tier colors
  locked. Fills wide screens with small margins; collapses to a single readable
  column on phones.

### Developer safety infrastructure
- Version control with a private GitHub backup (`chronicmclan-beep/atlas`).
- Data validation that runs before every build and blocks broken data with a
  plain-English message.
- Automated checks on GitHub (GitHub Actions): every push runs data validation,
  smoke tests, and a production build.
- Smoke tests that confirm all six sections render without crashing.

### Known/deferred (intentionally not built yet)
- Live market data (market cap / P-E show "—" until a data feed is wired up).
- Real company logos and animations.
- Public hosting (deploy config exists; the Pages workflow is manual-only for now).
- Error monitoring for real users (see MAINTENANCE.md → "When we launch").
