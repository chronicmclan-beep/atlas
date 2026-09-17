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
import glossaryFull from '../data/glossary-full.json'

export { config, layers, companies, kpis, revenue, supplyEdges, financing, timeline, glossary, glossaryFull }

/* ---------- Companies ---------- */

// ticker -> company record (internal; access via getCompany)
const companiesByTicker = Object.fromEntries(
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
const sourceTiers = (() => {
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
const realizedStates = Object.fromEntries(
  config.realizedStates.map((s) => [String(s.id), s]),
)

export function getRealizedState(realized) {
  return realizedStates[String(realized)] ?? null
}

/* ---------- Glossary ---------- */

// The master reference library. Entries keyed by id, and a term/alias lookup
// (case-insensitive) so tap-to-learn links resolve to their glossary entry.
export const glossaryEntries = glossaryFull.entries
export const glossaryTypes = glossaryFull.types

const glossaryById = Object.fromEntries(glossaryEntries.map((e) => [e.id, e]))
const glossaryByTerm = (() => {
  const map = new Map()
  for (const e of glossaryEntries) {
    map.set(e.term.toLowerCase(), e)
    for (const a of e.aliases ?? []) map.set(String(a).toLowerCase(), e)
  }
  return map
})()

// Resolve a term/id/alias to a full glossary entry.
export function getGlossaryEntry(termOrId) {
  if (!termOrId) return null
  const key = String(termOrId)
  return glossaryById[key] ?? glossaryByTerm.get(key.toLowerCase()) ?? null
}

export function getDefinition(label) {
  if (!label) return null
  // Prefer the master library; fall back to the legacy glossary.json map.
  return getGlossaryEntry(label)?.definition ?? glossary.terms[label] ?? null
}

/* ---------- Graph participation (for cross-links) ---------- */

// Tickers that appear as a node in each graph, used to decide whether a
// cross-link destination exists for a given company.
export const supplyParticipants = new Set(supplyEdges.edges.flatMap((e) => [e.from, e.to]))
export const financingParticipants = new Set(financing.edges.flatMap((e) => [e.from, e.to]))

/* ---------- KPIs ---------- */

// ticker -> kpi record
export const kpisByTicker = Object.fromEntries(kpis.map((k) => [k.ticker, k]))

/* ---------- Timeline config ---------- */

export const timelineCategories = Object.fromEntries(
  config.timelineCategories.map((c) => [c.id, c]),
)

export const eras = config.eras
