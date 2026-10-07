/*
  Lab variant — "Compare" (Company Comparison layout experiment).

  One tab, one brain, many faces: pick 2–8 companies and any metric. The
  view AUTO-FOLLOWS the metric by default — switching metrics switches the
  graphic to the recommended design element (vizFor's suggestion: ranked
  bars for multiples, diverging bars for growth, dials for margins, and so
  on). The "View as" switcher opens with "Auto (recommended)"; picking an
  explicit element overrides Auto for that metric only and is persisted per
  metric. The chart stage is
  the hero — the company panel collapses to a slim rail, the metric bar
  collapses to just its dropdown, and a focus mode hides everything except
  the chart, the ticker chips and the metric picker. Ticker chips are
  always live (× removes, + opens the picker — one tap, no apply step).

  Selection contract: every selected company ALWAYS renders in every
  visual; missing figures are marked "Not sourced", never dropped.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded.
*/
import { useEffect, useMemo, useState } from 'react'
import {
  METRICS,
  resolveFigure,
  availableMetrics,
  describeGap,
} from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { colorOf, nameOf } from '../shared/companyGroups.js'
import {
  CompanyPicker,
  MetricDropdown,
  InfoButton,
} from '../shared/LabShared.jsx'
import {
  useFocalInteraction,
  leaderIndex,
  ArrowRaceStage,
  DotScaleStage,
  DialStage,
  TimelineTapeStage,
  CashFlowStage,
  ShareDonutStage,
  BarsStage,
  RankedBarsStage,
  DivergingBarsStage,
} from '../shared/AdaptiveVisuals.jsx'

const DEFAULT_TICKERS = ['NVDA', 'AMD', 'AVGO']
const DEFAULT_METRIC = 'revenue'
const MIN_N = 2
const MAX_N = 8

const LS_FOCUS = 'atlas:compare-focus'
const LS_COMPANIES = 'atlas:compare-companies'
const LS_CONTEXT = 'atlas:compare-context'
const LS_VIEW = (id) => `atlas:compare-view-${id}`

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v === '1'
  } catch {
    return fallback
  }
}
function writeLS(key, val) {
  try {
    localStorage.setItem(key, val ? '1' : '0')
  } catch {
    /* private mode — layout just won't persist */
  }
}

/*
  The heart of the tab: metric type → design element (the "auto" suggestion).
  - Size & scale absolutes → arrow race (ranking is the story)
  - Valuation multiples → ranked bars (cheapest first; the dot scale stays
    as a manual option only — never a default)
  - Margins & returns % → radial dials (needle on a 0–100 face)
  - Growth → diverging bars (right of zero is growth, left is decline)
  - Cash flow (ocf/fcf) → waterfall (revenue becomes cash, step by step)
  - Latest quarter → donut (share of the selected group's quarter)
  - Balance-sheet absolutes → arrow race
  - Everything else → arrow race

  The DEFAULT view follows the metric automatically (the "auto" behavior).
  The owner can pin an explicit element per metric with the "View as"
  switcher (persisted per metric id); choosing "Auto (recommended)" clears
  the pin.
*/
function vizFor(def) {
  if (!def) return 'bars'
  const id = def.id
  if (id === 'ocf' || id === 'fcf') return 'waterfall'
  if (id === 'latest-quarter') return 'donut'
  if (['gross-margin', 'op-margin', 'net-margin', 'roe', 'roa'].includes(id)) return 'dials'
  if (['pe-trailing', 'ps', 'pfcf', 'beta', 'range-52w', 'debt-equity'].includes(id)) return 'ranked'
  if (def.family === 'growth') return 'diverge'
  return 'race'
}

const VIEW_LABELS = {
  auto: 'Auto (recommended)',
  bars: 'Bars',
  race: 'Arrows',
  ranked: 'Ranked',
  diverge: 'Diverging',
  dials: 'Dials',
  waterfall: 'Waterfall',
  donut: 'Donut',
  tape: 'Timeline',
  dots: 'Dots',
}

/* Which graphic elements are sensible for this metric type. "Auto" is
   always first (it resolves to the vizFor suggestion); "Bars" is the
   universal element that works everywhere. */
function viewsFor(def) {
  const ids = ['auto', 'bars']
  if (!def) return ids
  const s = vizFor(def)
  if (s !== 'bars') ids.push(s)
  const extra = (v) => {
    if (!ids.includes(v)) ids.push(v)
  }
  const id = def.id
  if (id === 'ocf' || id === 'fcf') extra('waterfall')
  if (id === 'latest-quarter') extra('donut')
  if (['gross-margin', 'op-margin', 'net-margin', 'roe', 'roa'].includes(id)) extra('dials')
  if (['pe-trailing', 'ps', 'pfcf', 'beta', 'range-52w', 'debt-equity'].includes(id)) extra('dots')
  if (def.family === 'growth' || id === 'revenue') extra('tape')
  return ids
}

const VIZ_WHY = {
  bars: 'Bars — one row per company, sorted.',
  race: 'Arrows race — length is the value, longest leads.',
  ranked: 'Ranked bars — cheapest multiple first.',
  diverge: 'Diverging bars — right of zero is growth, left is decline.',
  dials: 'Dials — the needle shows each company\u2019s percentage.',
  tape: 'Tape — quarterly revenue, quarter by quarter.',
  waterfall: 'Waterfall — revenue becomes cash, step by step.',
  donut: 'Donut — each slice is a share of the selected group.',
  dots: 'Dots on a shared scale — position is the multiple, not a ranking.',
}

function FocusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
    </svg>
  )
}

export default function VariantAdaptive() {
  const [tickers, setTickers] = useState(DEFAULT_TICKERS)
  const [metricId, setMetricId] = useState(DEFAULT_METRIC)
  const [focusMode, setFocusMode] = useState(() => readLS(LS_FOCUS, false))
  const [companiesOpen, setCompaniesOpen] = useState(() => readLS(LS_COMPANIES, true))
  const [contextOpen, setContextOpen] = useState(() => readLS(LS_CONTEXT, true))
  // Mobile drawer is never persisted and never auto-opens: it only opens
  // via the + button. (The desktop panel may default open; the drawer must not.)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => writeLS(LS_FOCUS, focusMode), [focusMode])
  useEffect(() => writeLS(LS_COMPANIES, companiesOpen), [companiesOpen])
  useEffect(() => writeLS(LS_CONTEXT, contextOpen), [contextOpen])

  const ix = useFocalInteraction()

  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const def = useMemo(
    () => METRICS.find((m) => m.id === metricId) ?? avail[0],
    [metricId, avail],
  )
  const mid = def ? def.id : DEFAULT_METRIC

  const figs = useMemo(() => tickers.map((t) => resolveFigure(mid, t)), [mid, tickers])
  const entries = useMemo(
    () => tickers.map((ticker, i) => ({ ticker, fig: figs[i] })),
    [tickers, figs],
  )
  const withVal = useMemo(() => entries.filter((e) => e.fig && e.fig.value != null), [entries])
  const lead = useMemo(() => leaderIndex(def, entries), [def, entries])
  const suggested = vizFor(def)
  const viewOptions = useMemo(() => viewsFor(def), [def])

  // "View as": Auto (recommended) is the default — the view follows the
  // metric via vizFor. An explicit choice pins one element for this metric
  // only and is persisted; choosing Auto clears the pin.
  const [storedView, setStoredView] = useState(null)
  useEffect(() => {
    try {
      setStoredView(localStorage.getItem(LS_VIEW(mid)))
    } catch {
      setStoredView(null)
    }
  }, [mid])
  const pinned = storedView && storedView !== 'auto' && viewOptions.includes(storedView) ? storedView : null
  const view = pinned ?? suggested
  const selectValue = pinned ?? 'auto'
  const chooseView = (v) => {
    try {
      if (v === 'auto') localStorage.removeItem(LS_VIEW(mid))
      else localStorage.setItem(LS_VIEW(mid), v)
    } catch {
      /* private mode — choice just won't persist */
    }
    setStoredView(v === 'auto' ? null : v)
  }

  // Universal bar list is sorted (best first) when the metric has a direction.
  const barsEntries = useMemo(() => {
    if (def?.higherIsBetter == null) return entries
    const dir = def.higherIsBetter ? -1 : 1
    const withV = []
    const withoutV = []
    entries.forEach((e) => {
      ;(e.fig && parseScalar(e.fig.value) != null ? withV : withoutV).push(e)
    })
    withV.sort((a, b) => dir * (parseScalar(a.fig.value) - parseScalar(b.fig.value)))
    return [...withV, ...withoutV]
  }, [def, entries])
  const barsLead = useMemo(() => leaderIndex(def, barsEntries), [def, barsEntries])

  const rankedCaption = useMemo(() => {
    if (!def) return 'Sorted low to high.'
    if (['pe-trailing', 'ps', 'pfcf'].includes(def.id))
      return 'Cheapest first — a lower multiple means paying less per dollar of fundamentals.'
    if (def.id === 'debt-equity') return 'Lowest first — less debt per dollar of equity.'
    return 'Sorted low to high.'
  }, [def])

  const takeaway = useMemo(() => (def ? describeGap(def, figs) : ''), [def, figs])

  const tickKey = tickers.join(',')
  useEffect(() => {
    ix.clearIsolate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mid, tickKey])

  const toggle = (t) =>
    setTickers((prev) => {
      if (prev.includes(t)) return prev.length <= MIN_N ? prev : prev.filter((x) => x !== t)
      return prev.length >= MAX_N ? prev : [...prev, t]
    })

  const showPanel = companiesOpen && !focusMode
  const showContext = contextOpen && !focusMode

  let stage
  if (withVal.length === 0) {
    stage = (
      <p className="py-xl text-center italic text-ink-faint text-body">
        No sourced figures for these companies on this metric — listed, not hidden.
      </p>
    )
  } else if (view === 'race') {
    stage = <ArrowRaceStage entries={entries} def={def} ix={ix} />
  } else if (view === 'ranked') {
    stage = <RankedBarsStage entries={entries} ix={ix} caption={rankedCaption} />
  } else if (view === 'diverge') {
    stage = <DivergingBarsStage entries={entries} ix={ix} />
  } else if (view === 'dots') {
    stage = <DotScaleStage entries={entries} ix={ix} />
  } else if (view === 'dials') {
    stage = <DialStage entries={entries} ix={ix} />
  } else if (view === 'tape') {
    stage = <TimelineTapeStage tickers={tickers} />
  } else if (view === 'waterfall') {
    stage = <CashFlowStage tickers={tickers} ix={ix} />
  } else if (view === 'donut') {
    stage = <ShareDonutStage entries={entries} lead={lead} ix={ix} />
  } else {
    stage = <BarsStage entries={barsEntries} lead={barsLead} ix={ix} />
  }

  return (
    <div className="rounded-card border border-line bg-surface p-md shadow-card sm:p-lg">
      {/* Header: metric picker (never hides) + info + view switcher + toggles */}
      <div className="flex flex-wrap items-center gap-sm">
        <MetricDropdown metricId={mid} onSelect={setMetricId} tickers={tickers} />
        {def && <InfoButton def={def} figs={figs} />}
        <label className="flex items-center gap-2xs text-caption text-ink-soft">
          <span>View as</span>
          <select
            value={selectValue}
            onChange={(e) => chooseView(e.target.value)}
            aria-label="Choose graphic element"
            className="rounded-control border border-line bg-surface px-sm py-2xs text-caption font-medium text-ink"
          >
            {viewOptions.map((v) => (
              <option key={v} value={v}>
                {VIEW_LABELS[v] ?? v}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2xs">
          <button
            type="button"
            onClick={() => setContextOpen((o) => !o)}
            aria-pressed={contextOpen}
            title={contextOpen ? 'Hide the takeaway line' : 'Show the takeaway line'}
            className="rounded-control border border-line px-sm py-2xs text-caption text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
          >
            {contextOpen ? 'Hide details' : 'Show details'}
          </button>
          <button
            type="button"
            onClick={() => setFocusMode((f) => !f)}
            aria-pressed={focusMode}
            title={focusMode ? 'Exit focus mode' : 'Focus mode — chart only'}
            className={
              'flex items-center gap-2xs rounded-control border px-sm py-2xs text-caption font-medium transition-colors ' +
              (focusMode
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-ink-soft hover:border-ink-faint hover:text-ink')
            }
          >
            <FocusIcon />
            {focusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>
      </div>

      {/* Ticker chips — always live, every mode */}
      <div className="mt-sm flex flex-wrap items-center gap-2xs" aria-label="Selected companies">
        {tickers.map((t) => (
          <span
            key={t}
            className="flex items-center gap-2xs rounded-pill py-2xs pl-sm pr-2xs text-caption font-medium text-white"
            style={{ background: colorOf(t) }}
            title={nameOf(t)}
          >
            {t}
            <button
              type="button"
              onClick={() => toggle(t)}
              disabled={tickers.length <= MIN_N}
              aria-label={`Remove ${t}`}
              title={tickers.length <= MIN_N ? `At least ${MIN_N} companies` : `Remove ${t}`}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40 disabled:cursor-default disabled:opacity-40"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => {
            setCompaniesOpen(true)
            setDrawerOpen(true)
          }}
          disabled={tickers.length >= MAX_N}
          aria-label="Add companies"
          title={tickers.length >= MAX_N ? `Maximum ${MAX_N} companies` : 'Add companies'}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-line text-label text-ink-soft transition-colors hover:border-ink-faint hover:text-ink disabled:cursor-default disabled:opacity-40"
        >
          <span aria-hidden="true">+</span>
        </button>
        <span className="ml-2xs text-caption text-ink-faint">
          {tickers.length}/{MAX_N}
        </span>
      </div>

      {/* Context strip: takeaway + why-this-visual (collapsible, hidden in focus) */}
      {showContext && (
        <div className="mt-sm rounded-control bg-surface-raised px-md py-sm">
          {takeaway && <p className="text-body font-medium text-ink">{takeaway}</p>}
          <p className="mt-2xs text-caption text-ink-faint">
            <span className="font-medium text-ink-soft">Why this visual: </span>
            {VIZ_WHY[view]}
          </p>
          <p className="mt-2xs text-caption text-ink-faint">
            {withVal.length} of {tickers.length} with data
            {withVal.length < tickers.length ? ' — the rest are marked, not hidden' : ''}
          </p>
        </div>
      )}

      {/* Main: company panel + stage */}
      <div className="mt-md flex items-stretch gap-md">
        {/* Desktop: sidebar collapsible to a slim rail */}
        <aside
          className={
            'hidden shrink-0 overflow-hidden transition-all duration-300 md:block ' +
            (showPanel ? 'w-64' : 'w-10')
          }
          aria-label="Company picker"
        >
          {showPanel ? (
            <div className="w-64 rounded-control border border-line bg-surface-raised p-sm">
              <div className="mb-xs flex items-center justify-between">
                <span className="text-eyebrow uppercase text-ink-faint">Companies</span>
                <button
                  type="button"
                  onClick={() => setCompaniesOpen(false)}
                  aria-label="Collapse company panel"
                  title="Collapse"
                  className="rounded-control px-2xs py-2xs text-caption text-ink-soft hover:bg-surface-hover hover:text-ink"
                >
                  <span aria-hidden="true">‹</span>
                </button>
              </div>
              <CompanyPicker tickers={tickers} onToggle={toggle} max={MAX_N} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCompaniesOpen(true)}
              aria-label="Open company panel"
              title="Companies"
              className="flex h-full min-h-48 w-10 flex-col items-center gap-sm rounded-control border border-line bg-surface-raised py-sm text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
            >
              <span aria-hidden="true">›</span>
              <span className="flex flex-col gap-2xs">
                {tickers.slice(0, 6).map((t) => (
                  <span key={t} className="h-2 w-2 rounded-full" style={{ background: colorOf(t) }} title={t} />
                ))}
              </span>
            </button>
          )}
        </aside>

        {/* Stage — the hero */}
        <div className="min-w-0 flex-1">
          <div key={mid + '|' + view + '|' + tickKey}>{stage}</div>
        </div>
      </div>

      {/* Mobile: company panel becomes an overlay drawer (only via the + button) */}
      {drawerOpen && !focusMode && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Company picker">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto bg-surface p-md shadow-card">
            <div className="mb-sm flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close company picker"
                className="rounded-control p-2xs text-ink-soft hover:bg-surface-hover hover:text-ink"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <CompanyPicker tickers={tickers} onToggle={toggle} max={MAX_N} />
          </div>
        </div>
      )}
    </div>
  )
}
