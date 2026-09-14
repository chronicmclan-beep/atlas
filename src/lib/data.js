/*
  Central data loader. The app is a renderer over these nine JSON files —
  components never hardcode figures; they read from here. Vite imports JSON
  natively, so these are static imports resolved at build time.
*/
import config from '../data/config.json'
import layers from '../data/layers.json'
import companies from '../data/companies.json'
import kpis from '../data/kpis.json'
import revenue from '../data/revenue.json'
import supplyEdges from '../data/supply-edges.json'
import financing from '../data/financing.json'
import timeline from '../data/timeline.json'
import glossary from '../data/glossary.json'

export { config, layers, companies, kpis, revenue, supplyEdges, financing, timeline, glossary }

/* ---------- Companies ---------- */

// ticker -> company record
export const companiesByTicker = Object.fromEntries(
  companies.map((c) => [c.ticker, c]),
)

export function getCompany(ticker) {
  return companiesByTicker[ticker] ?? null
}

// Resolve a ticker, name, or alias to a company (basis for Phase 4 cross-links).
const companyLookup = (() => {
  const map = new Map()
  for (const c of companies) {
    map.set(c.ticker.toLowerCase(), c)
    map.set(c.name.toLowerCase(), c)
    for (const alias of c.aliases ?? []) map.set(alias.toLowerCase(), c)
  }
  return map
})()

export function findCompany(nameOrTicker) {
  if (!nameOrTicker) return null
  return companyLookup.get(String(nameOrTicker).toLowerCase()) ?? null
}

// A company's display color, falling back to a neutral if none is set.
export function companyColor(ticker) {
  return getCompany(ticker)?.color ?? 'var(--ink-faint)'
}

/* ---------- Source tiers ---------- */

// id -> { id, label, note }. Includes a synthesized 'live' tier because
// kpis.json uses tier:'live' for figures that need a market-data feed,
// which the spec's four canonical tiers don't cover.
export const sourceTiers = (() => {
  const map = Object.fromEntries(config.sourceTiers.map((t) => [t.id, t]))
  if (!map.live) {
    map.live = { id: 'live', label: 'Live', note: 'Needs a live market-data feed; not yet wired up.' }
  }
  return map
})()

export function getTier(id) {
  return sourceTiers[id] ?? sourceTiers.inferred
}

/* ---------- Realized / committed ---------- */

// realizedStates from config keyed by boolean; true = realized, false = committed.
export const realizedStates = Object.fromEntries(
  config.realizedStates.map((s) => [String(s.id), s]),
)

export function getRealizedState(realized) {
  return realizedStates[String(realized)] ?? null
}

/* ---------- Glossary ---------- */

export function getDefinition(label) {
  if (!label) return null
  return glossary.terms[label] ?? null
}

export function hasDefinition(label) {
  return Boolean(getDefinition(label))
}

/* ---------- Graph participation (for cross-links) ---------- */

// Tickers that appear as a node in each graph, used to decide whether a
// cross-link destination exists for a given company.
export const supplyParticipants = new Set(supplyEdges.edges.flatMap((e) => [e.from, e.to]))
export const financingParticipants = new Set(financing.edges.flatMap((e) => [e.from, e.to]))

/* ---------- KPIs ---------- */

// ticker -> kpi record
export const kpisByTicker = Object.fromEntries(kpis.map((k) => [k.ticker, k]))

export function getKpis(ticker) {
  return kpisByTicker[ticker] ?? null
}

/* ---------- Timeline config ---------- */

export const timelineCategories = Object.fromEntries(
  config.timelineCategories.map((c) => [c.id, c]),
)

export const eras = config.eras
