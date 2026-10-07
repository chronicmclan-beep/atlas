import { useMemo, useState } from 'react'
import {
  FAMILIES,
  METRICS,
  resolveFigure,
  coverage,
  availableMetrics,
  describeGap,
  topTakeaways,
} from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { getCompany } from '../../lib/data.js'
import CompanyBadge from '../../components/common/CompanyBadge.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'

/*
  Lab variant — "Rail + live canvas" for the Company Comparison builder.

  Layout idea: a slim collapsible left rail holds every control (company
  picker + metric picker); the ENTIRE main area is a live result canvas
  that re-renders the instant anything is tapped. No apply buttons.

  Structure:
    <div class="md:flex">          — desktop: rail beside canvas
      <aside>                      — company + metric pickers; collapses
      <main>                       — hero takeaways, then one card/metric
    </div>
    <md:hidden>                    — mobile: pickers live in a top drawer

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. A metric appears only when it has coverage for the
  current ticker set. The stage is never empty: the last company and the
  last metric cannot be deselected.
*/

const GROUPS = [
  { label: 'Chip Design', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'MRVL', 'ARM'] },
  { label: 'Compute Providers', tickers: ['MSFT', 'AMZN', 'GOOGL', 'Meta', 'Oracle', 'CRWV'] },
]
const MAX_COMPANIES = 4
const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const DEFAULT_METRICS = ['revenue', 'gross-margin', 'op-margin', 'net-income', 'fcf']

function colorOf(ticker) {
  return getCompany(ticker)?.color ?? '#888888'
}
function nameOf(ticker) {
  return getCompany(ticker)?.name ?? ticker
}

/** Index of the leader among parseable figures, or -1 when no ▲ applies. */
function leaderIndex(def, entries) {
  if (def.higherIsBetter == null) return -1
  const scored = entries
    .map((e, i) => ({ i, n: parseScalar(e.fig?.value) }))
    .filter((s) => s.n != null)
  if (scored.length < 2) return -1
  const pick = def.higherIsBetter
    ? scored.reduce((a, b) => (b.n > a.n ? b : a))
    : scored.reduce((a, b) => (b.n < a.n ? b : a))
  return pick.i
}

function Chevron({ open, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={'inline-block text-ink-faint transition-transform ' + (open ? 'rotate-90' : '') + ' ' + className}
    >
      ›
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Explain panel — the 4 layers (what / why / good / generated meaning) */
/* ------------------------------------------------------------------ */

function ExplainPanel({ def, figs }) {
  const layers = [
    ['What it is', def.explain.what],
    ['Why it matters', def.explain.why],
    ['What good looks like', def.explain.good],
    ['What this result means', describeGap(def, figs)],
  ]
  const withVal = figs.filter((f) => f && f.value != null)
  return (
    <div className="border-t border-line/60 px-sm py-sm">
      <div className="grid gap-sm md:grid-cols-2">
        {layers.map(([title, body]) => (
          <div key={title}>
            <div className="text-eyebrow uppercase text-ink-faint">{title}</div>
            <p className="mt-2xs text-label text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
      {withVal.length > 0 && (
        <div className="mt-sm grid gap-2xs border-t border-line/60 pt-sm">
          {withVal.map((f) => (
            <div key={f.ticker} className="flex flex-wrap items-center gap-xs text-caption text-ink-faint">
              <span className="font-medium" style={{ color: colorOf(f.ticker) }}>
                {f.ticker}
              </span>
              <SourceTag tier={f.tier} />
              <span className="truncate">{f.source}</span>
              {f.asOf && <span>· {f.asOf}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bar-pair visual — one row per company, bars scaled to the max.        */
/* ▲ marks the leader when higherIsBetter is set. Unparseable figures    */
/* fall back to a plain value row (never hidden).                        */
/* ------------------------------------------------------------------ */

function BarPairs({ entries, lead }) {
  const scalars = entries.map((e) => parseScalar(e.fig?.value))
  const max = Math.max(...scalars.map((v) => Math.abs(v ?? 0)), 1e-9)
  return (
    <div className="mt-xs grid gap-2xs">
      {entries.map((e, i) => {
        const v = scalars[i]
        return (
          <div key={e.ticker} className="flex items-center gap-xs">
            <span className="flex w-24 shrink-0 items-center gap-2xs">
              <CompanyBadge name={e.ticker} size={18} />
              <span className="truncate text-caption font-medium" style={{ color: colorOf(e.ticker) }}>
                {e.ticker}
              </span>
            </span>
            {e.fig && v != null ? (
              <>
                <div className="h-3 min-w-6 flex-1 overflow-hidden rounded-pill bg-surface-raised">
                  <div
                    className="h-full rounded-pill transition-all duration-500"
                    style={{ width: `${Math.max(2, (Math.abs(v) / max) * 100)}%`, background: colorOf(e.ticker) }}
                  />
                </div>
                <span className="max-w-[38%] shrink-0 text-right text-caption leading-tight text-ink">
                  {e.fig.value}
                  {lead === i && (
                    <span className="ml-2xs" aria-label="Leads">
                      ▲
                    </span>
                  )}
                </span>
                <SourceTag tier={e.fig.tier} showLabel={false} />
              </>
            ) : (
              <span className="flex-1 text-caption italic text-ink-faint">
                {e.fig ? e.fig.value : 'Not sourced'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metric card — tap-to-inspect expands the 4-layer explanation panel    */
/* ------------------------------------------------------------------ */

function MetricCard({ def, tickers }) {
  const [open, setOpen] = useState(false)
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const lead = leaderIndex(def, entries)
  const missing = entries.filter((e) => !e.fig || e.fig.value == null).map((e) => e.ticker)

  return (
    <div className="rounded-card bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full px-sm py-sm text-left"
      >
        <span className="flex items-center justify-between gap-sm">
          <span className="text-label font-medium text-ink">{def.label}</span>
          <Chevron open={open} />
        </span>
        {withVal.length === 0 ? (
          <p className="mt-xs text-caption italic text-ink-faint">
            No data for these companies — listed, not hidden.
          </p>
        ) : (
          <BarPairs entries={entries} lead={lead} />
        )}
        <span className="mt-xs block text-caption leading-snug text-ink-soft">
          {describeGap(def, figs)}
        </span>
        {missing.length > 0 && (
          <span className="mt-2xs block text-caption italic text-ink-faint">
            Not sourced for: {missing.join(', ')}
          </span>
        )}
      </button>
      {open && <ExplainPanel def={def} figs={figs} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Picker bits (shared by rail + mobile drawer)                          */
/* ------------------------------------------------------------------ */

function CompanyPickers({ tickers, toggleTicker }) {
  return (
    <div>
      <div className="text-eyebrow uppercase text-ink-faint">Companies · {tickers.length}/{MAX_COMPANIES}</div>
      {GROUPS.map((g) => (
        <div key={g.label} className="mt-xs">
          <div className="text-caption font-medium text-ink-soft">{g.label}</div>
          <div className="mt-2xs flex flex-wrap gap-2xs">
            {g.tickers.map((t) => {
              const active = tickers.includes(t)
              const full = tickers.length >= MAX_COMPANIES && !active
              return (
                <button
                  key={t}
                  type="button"
                  disabled={full}
                  onClick={() => toggleTicker(t)}
                  aria-pressed={active}
                  title={full ? `Remove a company to add ${t}` : nameOf(t)}
                  className={
                    'inline-flex items-center gap-2xs rounded-control border px-2xs py-2xs text-caption transition-colors ' +
                    (active
                      ? 'border-transparent font-medium text-ink'
                      : 'border-line text-ink-soft hover:bg-surface-hover') +
                    (full ? ' opacity-40' : '')
                  }
                  style={active ? { background: colorOf(t) + '22', borderColor: colorOf(t) } : undefined}
                >
                  <CompanyBadge name={t} size={16} />
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricPickers({ metricIds, toggleMetric, coveredIds }) {
  // Show only metrics with data for the current ticker set, grouped by family.
  const avail = availableMetrics(
    GROUPS.flatMap((g) => g.tickers)
  ).filter((m) => coveredIds.includes(m.id))
  return (
    <div>
      <div className="text-eyebrow uppercase text-ink-faint">Metrics · {metricIds.length}</div>
      {FAMILIES.map((fam) => {
        const famMetrics = avail.filter((m) => m.family === fam.id)
        if (famMetrics.length === 0) return null
        return (
          <div key={fam.id} className="mt-xs">
            <div className="text-caption font-medium text-ink-soft">{fam.label}</div>
            <div className="mt-2xs flex flex-wrap gap-2xs">
              {famMetrics.map((m) => {
                const active = metricIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMetric(m.id)}
                    aria-pressed={active}
                    className={
                      'rounded-control border px-2xs py-2xs text-caption transition-colors ' +
                      (active
                        ? 'border-transparent bg-accent/15 font-medium text-ink'
                        : 'border-line text-ink-soft hover:bg-surface-hover')
                    }
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The variant                                                         */
/* ------------------------------------------------------------------ */

export default function CompareRailCanvas() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricIds, setMetricIds] = useState(DEFAULT_METRICS)
  // md+: rail collapse. <md: pickers move into a top drawer.
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Metrics with data for the CURRENT selection — picker + canvas only show these.
  const coveredIds = useMemo(
    () => METRICS.filter((m) => coverage(m.id, tickers) > 0).map((m) => m.id),
    [tickers]
  )

  const toggleTicker = (t) => {
    setTickers((prev) => {
      if (prev.includes(t)) {
        if (prev.length === 1) return prev // never empty the stage
        return prev.filter((x) => x !== t)
      }
      if (prev.length >= MAX_COMPANIES) return prev
      return [...prev, t]
    })
  }

  const toggleMetric = (id) => {
    setMetricIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev // never empty the stage
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  // Prune selected metrics that lost coverage after a company change;
  // if none survive, reseed with the first covered metric.
  const liveMetricIds = metricIds.filter((id) => coveredIds.includes(id))
  const activeMetricIds = useMemo(
    () =>
      liveMetricIds.length > 0
        ? liveMetricIds
        : coveredIds.length > 0
          ? [coveredIds[0]]
          : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metricIds, coveredIds]
  )
  const activeDefs = useMemo(
    () => activeMetricIds.map((id) => METRICS.find((m) => m.id === id)).filter(Boolean),
    [activeMetricIds]
  )

  const takeaways = useMemo(() => topTakeaways(activeMetricIds, tickers), [activeMetricIds, tickers])

  const railContent = (
    <div className="grid gap-sm">
      <CompanyPickers tickers={tickers} toggleTicker={toggleTicker} />
      <div className="border-t border-line/60 pt-sm">
        <MetricPickers metricIds={metricIds} toggleMetric={toggleMetric} coveredIds={coveredIds} />
      </div>
      {/* Experimental badge — Lab content is not verified production data. */}
      <div className="text-caption italic text-ink-faint">
        Experimental layout · figures carry their normal source tiers
      </div>
    </div>
  )

  return (
    <div className="md:flex md:gap-sm">
      {/* ---- Mobile: collapsible top drawer (<md) ---- */}
      <div className="mb-sm md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          className="flex w-full items-center justify-between rounded-card bg-surface px-sm py-xs shadow-card"
        >
          <span className="text-label font-medium text-ink">
            {tickers.join(' · ')} · {activeMetricIds.length} metrics
          </span>
          <Chevron open={drawerOpen} />
        </button>
        {drawerOpen && (
          <div className="mt-2xs rounded-card bg-surface px-sm py-sm shadow-card">{railContent}</div>
        )}
      </div>

      {/* ---- Desktop: collapsible left rail (md+) ---- */}
      {railCollapsed ? (
        <aside className="hidden shrink-0 md:block">
          <button
            type="button"
            onClick={() => setRailCollapsed(false)}
            aria-label="Open comparison controls"
            title="Open comparison controls"
            className="flex h-full min-h-64 w-10 flex-col items-center gap-xs rounded-card bg-surface py-sm shadow-card hover:bg-surface-hover"
          >
            <span aria-hidden="true" className="text-ink-faint">
              ›
            </span>
            <span className="flex flex-wrap justify-center gap-2xs">
              {tickers.map((t) => (
                <span
                  key={t}
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: colorOf(t) }}
                  title={nameOf(t)}
                />
              ))}
            </span>
            <span className="text-caption text-ink-faint [writing-mode:vertical-rl]">
              {activeMetricIds.length} metrics
            </span>
          </button>
        </aside>
      ) : (
        <aside className="hidden md:block md:w-64 md:shrink-0">
          <div className="rounded-card bg-surface px-sm py-sm shadow-card">
            <div className="mb-sm flex items-center justify-between">
              <span className="text-eyebrow uppercase text-ink-faint">Controls</span>
              <button
                type="button"
                onClick={() => setRailCollapsed(true)}
                aria-label="Collapse comparison controls"
                title="Collapse comparison controls"
                className="rounded-control px-2xs text-ink-faint hover:bg-surface-hover"
              >
                <span aria-hidden="true">‹</span>
              </button>
            </div>
            {railContent}
          </div>
        </aside>
      )}

      {/* ---- Live result canvas ---- */}
      <main className="min-w-0 flex-1">
        {/* Hero takeaway callouts across the top */}
        {takeaways.length > 0 && (
          <div className="grid gap-sm sm:grid-cols-3">
            {takeaways.map((t, i) => (
              <div key={i} className="rounded-card bg-surface-raised px-sm py-sm shadow-card">
                <div className="text-body font-medium text-ink">{t.figure}</div>
                <div className="mt-2xs text-caption leading-snug text-ink-soft">{t.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* One card per selected metric — live on every tap */}
        <div className="mt-sm grid gap-sm">
          {activeDefs.map((def) => (
            <MetricCard key={def.id} def={def} tickers={tickers} />
          ))}
        </div>

        {activeDefs.length === 0 && (
          <p className="text-caption italic text-ink-faint">
            No metrics have data for this company set.
          </p>
        )}
      </main>
    </div>
  )
}
