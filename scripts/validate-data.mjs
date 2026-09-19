/*
  Data validation — runs before every build (npm run build) and in CI.
  Checks the nine JSON files in src/data for problems that would break the app,
  and prints plain-English messages pointing at the exact file and issue.

  Checks:
    1. Every file is valid JSON.
    2. Required fields are present.
    3. Every company ticker referenced in kpis / revenue / supply-edges /
       financing / timeline actually exists in companies.json.
    4. Every source tier is one of the allowed values.
    5. Every layer id used is one defined in layers.json.
    6. Timeline categories / eras / major-minor tiers are valid.

  Exit code 0 = all good; 1 = problems found (which fails the build).
*/
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const rel = (f) => `src/data/${f}`

const errors = []
const err = (file, msg) => errors.push(`${rel(file)} — ${msg}`)

// Load + JSON-parse one file. Records a clear error and returns null on failure.
function load(file) {
  let raw
  try {
    raw = readFileSync(join(DATA_DIR, file), 'utf8')
  } catch {
    err(file, 'file is missing (expected in src/data/).')
    return null
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    err(file, `is not valid JSON — ${e.message}. Check for a missing comma, quote, or bracket.`)
    return null
  }
}

const data = {
  config: load('config.json'),
  layers: load('layers.json'),
  companies: load('companies.json'),
  kpis: load('kpis.json'),
  revenue: load('revenue.json'),
  supplyEdges: load('supply-edges.json'),
  financing: load('financing.json'),
  timeline: load('timeline.json'),
  glossary: load('glossary.json'),
}

// Reference sets built from the source-of-truth files.
const allowedTiers = new Set()
if (Array.isArray(data.config?.sourceTiers)) {
  for (const t of data.config.sourceTiers) allowedTiers.add(t.id)
}
allowedTiers.add('live') // kpis.json uses 'live' for figures awaiting a market feed
const tierList = [...allowedTiers].join(', ')

const validLayers = new Set(Array.isArray(data.layers) ? data.layers.map((l) => l.id) : [])
const validTickers = new Set(
  Array.isArray(data.companies) ? data.companies.map((c) => c.ticker) : [],
)
const validCategories = new Set(
  Array.isArray(data.config?.timelineCategories)
    ? data.config.timelineCategories.map((c) => c.id)
    : [],
)
const validEras = new Set(data.config?.eras ? Object.keys(data.config.eras) : [])

const has = (obj, field) => obj && Object.prototype.hasOwnProperty.call(obj, field)

/* ---------- config.json ---------- */
if (data.config) {
  for (const f of ['sourceTiers', 'realizedStates', 'layers', 'timelineCategories', 'eras']) {
    if (!has(data.config, f)) err('config.json', `missing required top-level field "${f}".`)
  }
  if (Array.isArray(data.config.layers)) {
    for (const lid of data.config.layers) {
      if (!validLayers.has(lid)) err('config.json', `layers list includes "${lid}", which is not a layer id in layers.json.`)
    }
  }
}

/* ---------- layers.json ---------- */
if (Array.isArray(data.layers)) {
  data.layers.forEach((l, i) => {
    for (const f of ['id', 'num', 'name', 'color', 'desc', 'companies']) {
      if (!has(l, f)) err('layers.json', `layer #${i + 1} (${l.id ?? '?'}) is missing required field "${f}".`)
    }
  })
}

/* ---------- companies.json ---------- */
if (Array.isArray(data.companies)) {
  data.companies.forEach((c, i) => {
    for (const f of ['ticker', 'name', 'layer', 'color']) {
      if (!has(c, f)) err('companies.json', `company #${i + 1} (${c.ticker ?? c.name ?? '?'}) is missing required field "${f}".`)
    }
    if (c.layer && !validLayers.has(c.layer)) err('companies.json', `company "${c.ticker}" has unknown layer "${c.layer}".`)
    if (c.secondaryLayer && !validLayers.has(c.secondaryLayer)) err('companies.json', `company "${c.ticker}" has unknown secondaryLayer "${c.secondaryLayer}".`)
  })
}

/* ---------- kpis.json ---------- */
if (Array.isArray(data.kpis)) {
  data.kpis.forEach((rec) => {
    if (!has(rec, 'ticker')) return err('kpis.json', `a record is missing "ticker".`)
    if (!validTickers.has(rec.ticker)) err('kpis.json', `record references unknown company "${rec.ticker}" (not in companies.json).`)
    if (!Array.isArray(rec.metrics)) return err('kpis.json', `${rec.ticker} is missing its "metrics" list.`)
    rec.metrics.forEach((m) => {
      if (!has(m, 'label')) err('kpis.json', `${rec.ticker} has a metric with no "label".`)
      if (!has(m, 'tier')) err('kpis.json', `${rec.ticker} metric "${m.label}" is missing "tier".`)
      else if (!allowedTiers.has(m.tier)) err('kpis.json', `${rec.ticker} metric "${m.label}" has invalid source tier "${m.tier}" (allowed: ${tierList}).`)
    })
  })
}

/* ---------- revenue.json ---------- */
if (data.revenue) {
  const q = Array.isArray(data.revenue.quarters) ? data.revenue.quarters.length : 0
  if (!q) err('revenue.json', `missing or empty "quarters" list.`)
  if (Array.isArray(data.revenue.series)) {
    data.revenue.series.forEach((s) => {
      if (!validTickers.has(s.ticker)) err('revenue.json', `series references unknown company "${s.ticker}" (not in companies.json).`)
      if (!allowedTiers.has(s.tier)) err('revenue.json', `${s.ticker} series has invalid source tier "${s.tier}" (allowed: ${tierList}).`)
      if (Array.isArray(s.revenue) && q && s.revenue.length !== q)
        err('revenue.json', `${s.ticker} has ${s.revenue.length} revenue points but there are ${q} quarters — they must match.`)
    })
  }
}

/* ---------- supply-edges.json ---------- */
if (data.supplyEdges && Array.isArray(data.supplyEdges.edges)) {
  data.supplyEdges.edges.forEach((e) => {
    if (!validTickers.has(e.from)) err('supply-edges.json', `an edge's supplier "${e.from}" is not a company in companies.json.`)
    if (!validTickers.has(e.to)) err('supply-edges.json', `an edge's customer "${e.to}" is not a company in companies.json.`)
    if (!allowedTiers.has(e.tier)) err('supply-edges.json', `the ${e.from}→${e.to} edge has invalid source tier "${e.tier}" (allowed: ${tierList}).`)
  })
}

/* ---------- financing.json ---------- */
if (data.financing && Array.isArray(data.financing.edges)) {
  data.financing.edges.forEach((e) => {
    if (!validTickers.has(e.from)) err('financing.json', `a flow's source "${e.from}" is not a company in companies.json.`)
    if (!validTickers.has(e.to)) err('financing.json', `a flow's recipient "${e.to}" is not a company in companies.json.`)
    if (!allowedTiers.has(e.tier)) err('financing.json', `the ${e.from}→${e.to} flow has invalid source tier "${e.tier}" (allowed: ${tierList}).`)
    if (typeof e.realized !== 'boolean') err('financing.json', `the ${e.from}→${e.to} flow's "realized" must be true or false.`)
  })
}

/* ---------- timeline.json ---------- */
if (data.timeline && Array.isArray(data.timeline.events)) {
  data.timeline.events.forEach((ev) => {
    const who = ev.title ?? ev.date ?? '?'
    for (const f of ['date', 'title', 'category', 'tier', 'era']) {
      if (!has(ev, f)) err('timeline.json', `event "${who}" is missing required field "${f}".`)
    }
    if (ev.category && !validCategories.has(ev.category)) err('timeline.json', `event "${who}" has unknown category "${ev.category}".`)
    if (ev.era && !validEras.has(ev.era)) err('timeline.json', `event "${who}" has unknown era "${ev.era}".`)
    if (ev.tier && ev.tier !== 'major' && ev.tier !== 'minor') err('timeline.json', `event "${who}" has tier "${ev.tier}" (must be "major" or "minor").`)
    if (Array.isArray(ev.companies)) {
      for (const c of ev.companies) {
        if (!validTickers.has(c)) err('timeline.json', `event "${who}" references unknown company "${c}" (not in companies.json).`)
      }
    }
  })
}

/* ---------- glossary.json ---------- */
if (data.glossary) {
  if (!data.glossary.terms || typeof data.glossary.terms !== 'object')
    err('glossary.json', `missing a "terms" object mapping labels to definitions.`)
}

/* ---------- Data Health (warnings — the accountability dashboard) ----------
   These never fail the build; they are the visible dashboard for the
   DATA_ACCOUNTABILITY.md system. A warning unaddressed across two updates
   graduates to a hard error. */
const warnings = []
const warn = (file, msg) => warnings.push(`${rel(file)} — ${msg}`)

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

/* 1. Timeline date/displayDate consistency — the audit's most common bug class. */
if (data.timeline && Array.isArray(data.timeline.events)) {
  data.timeline.events.forEach((ev) => {
    const who = `event "${ev.title ?? ev.date ?? '?'}"`
    if (!ev.source) warn('timeline.json', `${who} has no citable source.`)
    if (!ev.date || !ev.displayDate) return
    const iso = new Date(`${ev.date}T00:00:00Z`)
    if (Number.isNaN(iso.getTime())) return
    const dd = String(ev.displayDate)
    const y = dd.match(/\b(19|20)\d{2}\b/)
    if (y && parseInt(y[0], 10) !== iso.getUTCFullYear())
      warn('timeline.json', `${who}: displayDate year ${y[0]} disagrees with date ${ev.date}.`)
    const m = dd.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)
    if (m && MONTHS[m[1].toLowerCase()] !== iso.getUTCMonth())
      warn('timeline.json', `${who}: displayDate month "${m[0]}" disagrees with date ${ev.date}.`)
    let rest = y ? dd.replace(y[0], ' ') : dd
    rest = rest.replace(/\b[QH][1-4]\b/gi, ' ') // strip "Q1"/"H2" so the quarter number isn't read as a day
    const d = rest.match(/\b(\d{1,2})\b/)
    if (d && parseInt(d[1], 10) !== iso.getUTCDate())
      warn('timeline.json', `${who}: displayDate day ${d[1]} disagrees with date ${ev.date}.`)
  })
}

/* 2. Provenance coverage — share of figures carrying source + tier. */
const healthRows = []
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a')
if (Array.isArray(data.kpis)) {
  const n = data.kpis.filter((r) => r.source && !/not yet sourced/i.test(r.source)).length
  healthRows.push(['kpis.json', `${n}/${data.kpis.length} company records sourced`, pct(n, data.kpis.length)])
}
if (data.timeline && Array.isArray(data.timeline.events)) {
  const n = data.timeline.events.filter((e) => e.source).length
  healthRows.push(['timeline.json', `${n}/${data.timeline.events.length} events with source`, pct(n, data.timeline.events.length)])
}
if (data.financing && Array.isArray(data.financing.edges)) {
  const n = data.financing.edges.filter((e) => e.asOf || e.note).length
  healthRows.push(['financing.json', `${n}/${data.financing.edges.length} flows with asOf/note`, pct(n, data.financing.edges.length)])
}
if (data.supplyEdges && Array.isArray(data.supplyEdges.edges)) {
  const n = data.supplyEdges.edges.filter((e) => e.note || e.tier === 'reported' || e.tier === 'disclosed').length
  healthRows.push(['supply-edges.json', `${n}/${data.supplyEdges.edges.length} edges with note/reported/disclosed tier`, pct(n, data.supplyEdges.edges.length)])
}
if (data.revenue && Array.isArray(data.revenue.series)) {
  const n = data.revenue.series.filter((s) => s.tier && s.tier !== 'unsourced').length
  healthRows.push(['revenue.json', `${n}/${data.revenue.series.length} series sourced`, pct(n, data.revenue.series.length)])
}

/* 3. Staleness — the audit's biggest error class. */
if (data.timeline && data.timeline.updated) {
  const updated = new Date(`${data.timeline.updated}T00:00:00Z`)
  if (!Number.isNaN(updated.getTime())) {
    const days = Math.round((Date.now() - updated.getTime()) / 86400000)
    if (days > 120)
      warn('timeline.json', `data freeze is ${days} days old (${data.timeline.updated}) — "latest" figures may be stale.`)
  }
}

/* ---------- Report ---------- */
const printHealth = () => {
  console.log('\n── Data Health (accountability dashboard) ──')
  for (const [file, what, coverage] of healthRows) console.log(`  ${file}: ${what} (${coverage})`)
  if (warnings.length === 0) {
    console.log('  No warnings — provenance, dates, and freshness all clean.')
  } else {
    console.log(`\n  ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (do not fail the build — address within two updates):`)
    for (const w of warnings) console.log(`  • ${w}`)
  }
  console.log('')
}

if (errors.length === 0) {
  console.log('✓ Data check passed — all 9 JSON files are valid and consistent.')
  printHealth()
  process.exit(0)
} else {
  console.error(`\n✗ Data check FAILED — ${errors.length} problem${errors.length === 1 ? '' : 's'} found:\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error('\nFix the item(s) above, then try again. The build was stopped so a broken change cannot go live.\n')
  printHealth()
  process.exit(1)
}
