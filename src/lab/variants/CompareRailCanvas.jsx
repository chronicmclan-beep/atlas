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

  Layout idea: a slim collapsible left rail holds every control (presets,
  company picker, metric picker with search + collapsible families); the
  ENTIRE main area is a live result canvas that re-renders the instant
  anything is tapped. A sticky summary bar pins the current selection to
  the top of the canvas while scrolling.

  Canvas cards support: tap-to-inspect explanations, per-card chart
  switcher (bars ↔ native donut/gauge), drag-to-reorder (desktop) with
  up/down arrow fallback (touch), and a compact/comfortable density
  toggle in the sticky bar.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. A metric appears only when it has coverage for the
  current ticker set. The stage is never empty: the last company and the
  last metric cannot be deselected.
*/

const GROUPS = [
  { label: 'Chip Design', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'MRVL', 'ARM', 'QCOM'] },
  { label: 'Semi Equipment', tickers: ['ASML', 'AMAT', 'LRCX', 'KLAC', 'TER', 'AMCR'] },
  { label: 'Memory & Storage', tickers: ['MU', 'SNDK', 'STX', 'WDC'] },
  { label: 'Networking & Optical', tickers: ['ANET', 'CRDO', 'ALAB', 'CSCO', 'HPE', 'COHR', 'LITE', 'FN', 'AAOI', 'POET', 'CIEN'] },
  { label: 'Compute & Miners', tickers: ['MSFT', 'AMZN', 'GOOGL', 'Meta', 'Oracle', 'CRWV', 'NBIS', 'IREN', 'WULF', 'HUT', 'GLXY', 'APLD'] },
  { label: 'Energy', tickers: ['VST', 'TLN', 'NRG', 'GEV', 'BE', 'PWR', 'FIX'] },
  { label: 'Software', tickers: ['PLTR', 'NOW', 'CRM', 'SNOW', 'MDB', 'DDOG', 'APP', 'TEAM', 'TWLO', 'CRWD', 'PANW', 'ZS', 'NET', 'S', 'FTNT', 'OKTA'] },
]
const MAX_COMPANIES = 4
const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const DEFAULT_METRICS = ['revenue', 'gross-margin', 'op-margin', 'net-income', 'fcf']

const PRESETS = [
  { id: 'nvda-amd', label: 'NVDA vs AMD', tickers: ['NVDA', 'AMD'], metrics: DEFAULT_METRICS },
  {
    id: 'cloud-kings',
    label: 'Cloud kings',
    tickers: ['MSFT', 'AMZN', 'GOOGL'],
    metrics: ['cloud-revenue', 'ai-revenue', 'backlog', 'capex', 'revenue'],
  },
  {
    id: 'chip-designers',
    label: 'Chip designers',
    tickers: ['NVDA', 'AMD', 'AVGO', 'MRVL'],
    metrics: ['revenue', 'gross-margin', 'op-margin', 'net-income', 'net-margin'],
  },
]

/* Metrics that get a native chart alternative to bars. */
const GAUGE_IDS = new Set(['gross-margin', 'op-margin', 'net-margin', 'roe', 'roa'])
function nativeChartFor(def) {
  if (def.family === 'size') return 'donut'
  if (GAUGE_IDS.has(def.id)) return 'gauge'
  return null
}
const NATIVE_LABEL = { donut: 'Donut', gauge: 'Gauge' }

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
/* Native charts (recovered from the retired chart-per-metric variant):  */
/* DONUT for size/share metrics, RADIAL GAUGE for margins/returns.      */
/* ------------------------------------------------------------------ */

function DonutChart({ entries, lead }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null && s.v > 0)
  if (scored.length === 0) return null
  const total = scored.reduce((a, s) => a + s.v, 0)
  const R = 46
  const C = 2 * Math.PI * R
  let acc = 0 // cumulative share consumed so far — drives each segment's offset
  const leader = lead >= 0 ? entries[lead] : scored.reduce((a, b) => (b.v > a.v ? b : a)).e
  return (
    <div className="mt-xs flex items-center gap-md">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Relative share donut">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="18" className="stroke-line" opacity="0.3" />
          {scored.map((s) => {
            const frac = s.v / total
            const len = Math.max(0, frac * C - 1.5) // 1.5px gap keeps neighbors readable
            const off = -acc * C
            acc += frac
            return (
              <circle
                key={s.e.ticker}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={colorOf(s.e.ticker)}
                strokeWidth="18"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={off}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="text-label font-semibold leading-tight text-ink">
            {leader?.fig?.value?.split(' ')[0]}
          </span>
          <span className="text-caption leading-tight text-ink-faint">{leader?.ticker} leads</span>
        </div>
      </div>
      <ul className="grid min-w-0 flex-1 gap-2xs">
        {scored.map((s) => (
          <li key={s.e.ticker} className="flex items-center gap-xs text-caption">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(s.e.ticker) }} />
            <span className="truncate font-medium" style={{ color: colorOf(s.e.ticker) }}>
              {s.e.ticker}
            </span>
            <span className="truncate text-ink-soft">{s.e.fig.value}</span>
            <span className="ml-auto shrink-0 text-ink-faint">{((s.v / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GaugeChart({ entries }) {
  return (
    <div className="mt-xs grid grid-cols-2 gap-sm sm:grid-cols-4">
      {entries.map((e) => {
        const v = parseScalar(e.fig?.value)
        const frac = v == null ? null : Math.min(1, Math.max(0, v / 100))
        // Semicircle arc: start (12,60) → end (108,60), radius 48.
        const arc =
          frac == null || frac <= 0
            ? ''
            : (() => {
                const x = 60 - 48 * Math.cos(Math.PI * frac)
                const y = 60 - 48 * Math.sin(Math.PI * frac)
                return `M12,60 A48,48 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}`
              })()
        return (
          <div key={e.ticker} className="flex flex-col items-center rounded-control bg-surface-raised px-2xs py-xs">
            <svg viewBox="0 0 120 76" className="w-full max-w-32" role="img" aria-label={`${e.ticker} gauge`}>
              <path d="M12,60 A48,48 0 0 1 108,60" fill="none" strokeWidth="9" className="stroke-line" opacity="0.35" strokeLinecap="round" />
              {arc && (
                <path d={arc} fill="none" stroke={colorOf(e.ticker)} strokeWidth="9" strokeLinecap="round" />
              )}
            </svg>
            <div className="-mt-3 text-center">
              <div className="flex items-center justify-center gap-2xs">
                <CompanyBadge name={e.ticker} size={14} />
                <span className="text-caption font-medium" style={{ color: colorOf(e.ticker) }}>
                  {e.ticker}
                </span>
              </div>
              <div className="text-label font-semibold text-ink">
                {e.fig ? e.fig.value.split(' ')[0] : <span className="italic text-ink-faint">Not sourced</span>}
              </div>
              {e.fig && <SourceTag tier={e.fig.tier} showLabel={false} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metric card — tap-to-inspect, per-card chart switcher, reorder arrows */
/* ------------------------------------------------------------------ */

function MetricCard({ def, tickers, density, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open, setOpen] = useState(false)
  const [chartMode, setChartMode] = useState('bars') // 'bars' | 'native'
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const lead = leaderIndex(def, entries)
  const missing = entries.filter((e) => !e.fig || e.fig.value == null).map((e) => e.ticker)

  const native = nativeChartFor(def)
  const showDonut =
    chartMode === 'native' &&
    native === 'donut' &&
    entries.some((e) => (parseScalar(e.fig?.value) ?? 0) > 0)
  const showGauge = chartMode === 'native' && native === 'gauge'

  const padX = density === 'compact' ? 'px-2xs' : 'px-sm'
  const padTop = density === 'compact' ? 'pt-2xs' : 'pt-sm'
  const padBottom = density === 'compact' ? 'pb-2xs' : 'pb-sm'

  const switchBtn = (mode, label) => (
    <button
      key={mode}
      type="button"
      onClick={() => setChartMode(mode)}
      aria-pressed={chartMode === mode}
      className={
        'rounded-control px-2xs py-2xs text-caption transition-colors ' +
        (chartMode === mode ? 'bg-accent/15 font-medium text-ink' : 'text-ink-faint hover:text-ink-soft')
      }
    >
      {label}
    </button>
  )

  const arrowBtn = (onClick, dir, disabled, label) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        'shrink-0 rounded-control px-2xs text-caption transition-colors ' +
        (disabled ? 'cursor-default text-ink-faint opacity-30' : 'text-ink-faint hover:bg-surface-hover hover:text-ink')
      }
    >
      <span aria-hidden="true">{dir === -1 ? '↑' : '↓'}</span>
    </button>
  )

  return (
    <div className="rounded-card bg-surface shadow-card">
      <div className={`flex items-center gap-2xs ${padX} ${padTop}`}>
        <span className="shrink-0 cursor-grab text-ink-faint" title="Drag to reorder" aria-hidden="true">
          ⋮⋮
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-sm text-left"
        >
          <span className="truncate text-label font-medium text-ink">{def.label}</span>
          <Chevron open={open} />
        </button>
        {native && withVal.length > 0 && (
          <span className="flex shrink-0 items-center rounded-control border border-line">
            {switchBtn('bars', 'Bars')}
            {switchBtn('native', NATIVE_LABEL[native])}
          </span>
        )}
        {arrowBtn(onMoveUp, -1, isFirst, `Move ${def.label} up`)}
        {arrowBtn(onMoveDown, 1, isLast, `Move ${def.label} down`)}
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`block w-full text-left ${padX} ${padBottom}`}>
        {withVal.length === 0 ? (
          <p className="mt-xs text-caption italic text-ink-faint">
            No data for these companies — listed, not hidden.
          </p>
        ) : showDonut ? (
          <DonutChart entries={entries} lead={lead} />
        ) : showGauge ? (
          <GaugeChart entries={entries} />
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
  // Families start collapsed; search filters across all families.
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set(FAMILIES.map((f) => f.id)))
  const avail = availableMetrics(
    GROUPS.flatMap((g) => g.tickers)
  ).filter((m) => coveredIds.includes(m.id))
  const q = query.trim().toLowerCase()

  const toggleFam = (famId) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(famId)) next.delete(famId)
      else next.add(famId)
      return next
    })
  }

  const chip = (m) => {
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
  }

  return (
    <div>
      <div className="text-eyebrow uppercase text-ink-faint">Metrics · {metricIds.length}</div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search metrics…"
        aria-label="Search metrics"
        className="mt-xs w-full rounded-control border border-line bg-bg px-xs py-2xs text-caption text-ink placeholder:text-ink-faint"
      />
      {q ? (
        <div className="mt-xs flex flex-wrap gap-2xs">
          {avail.filter((m) => m.label.toLowerCase().includes(q)).map(chip)}
          {avail.filter((m) => m.label.toLowerCase().includes(q)).length === 0 && (
            <span className="text-caption italic text-ink-faint">No metrics match “{query.trim()}”.</span>
          )}
        </div>
      ) : (
        FAMILIES.map((fam) => {
          const famMetrics = avail.filter((m) => m.family === fam.id)
          if (famMetrics.length === 0) return null
          const sel = famMetrics.filter((m) => metricIds.includes(m.id)).length
          const isCollapsed = collapsed.has(fam.id)
          return (
            <div key={fam.id} className="mt-xs">
              <button
                type="button"
                onClick={() => toggleFam(fam.id)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between gap-xs"
              >
                <span className="text-caption font-medium text-ink-soft">
                  {fam.label} · {sel}/{famMetrics.length}
                </span>
                <Chevron open={!isCollapsed} />
              </button>
              {!isCollapsed && (
                <div className="mt-2xs flex flex-wrap gap-2xs">{famMetrics.map(chip)}</div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The variant                                                         */
/* ------------------------------------------------------------------ */

export default function CompareRailCanvas() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricIds, setMetricIds] = useState(DEFAULT_METRICS)
  const [activePreset, setActivePreset] = useState('nvda-amd')
  const [density, setDensity] = useState('comfortable') // 'comfortable' | 'compact'
  const [order, setOrder] = useState(DEFAULT_METRICS) // canvas card order (drag/arrows)
  const [dragId, setDragId] = useState(null)
  // md+: rail collapse. <md: pickers move into a top drawer.
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Metrics with data for the CURRENT selection — picker + canvas only show these.
  const coveredIds = useMemo(
    () => METRICS.filter((m) => coverage(m.id, tickers) > 0).map((m) => m.id),
    [tickers]
  )

  const toggleTicker = (t) => {
    setActivePreset(null)
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
    setActivePreset(null)
    setMetricIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev // never empty the stage
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  const applyPreset = (p) => {
    setTickers(p.tickers)
    setMetricIds(p.metrics.filter((id) => coverage(id, p.tickers) > 0))
    setActivePreset(p.id)
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

  // Canvas order: keep the user's arrangement, append newly added metrics.
  const orderedDefs = useMemo(() => {
    const active = new Set(activeMetricIds)
    const kept = order.filter((id) => active.has(id))
    const fresh = activeMetricIds.filter((id) => !kept.includes(id))
    return [...kept, ...fresh].map((id) => METRICS.find((m) => m.id === id)).filter(Boolean)
  }, [order, activeMetricIds])

  const moveCard = (id, dir) => {
    const ids = orderedDefs.map((d) => d.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    const next = [...ids]
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    setOrder(next)
  }

  const dropOn = (targetId) => (e) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    const ids = orderedDefs.map((d) => d.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = ids.filter((id) => id !== dragId)
    next.splice(to, 0, dragId)
    setOrder(next)
    setDragId(null)
  }

  const takeaways = useMemo(() => topTakeaways(activeMetricIds, tickers), [activeMetricIds, tickers])
  const topTakeaway = takeaways[0]

  const railContent = (
    <div className="grid gap-sm">
      <div>
        <div className="text-eyebrow uppercase text-ink-faint">Presets</div>
        <div className="mt-2xs flex flex-wrap gap-2xs">
          {PRESETS.map((p) => {
            const active = activePreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                aria-pressed={active}
                className={
                  'rounded-control border px-xs py-2xs text-caption transition-colors ' +
                  (active
                    ? 'border-transparent bg-accent/15 font-medium text-ink'
                    : 'border-line text-ink-soft hover:bg-surface-hover')
                }
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
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

  const cardGap = density === 'compact' ? 'gap-2xs' : 'gap-sm'
  const heroPad = density === 'compact' ? 'px-2xs py-2xs' : 'px-sm py-sm'

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
          <span className="truncate text-label font-medium text-ink">
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
        {/* Sticky summary bar — selection + top takeaway + density toggle */}
        <div className="sticky top-0 z-10 mb-sm border-b border-line/60 bg-bg/95 py-xs backdrop-blur">
          <div className="flex items-center gap-sm">
            <div className="min-w-0 flex-1 truncate text-caption">
              <span className="font-medium text-ink">{tickers.join(' + ')}</span>
              <span className="text-ink-faint"> · {activeMetricIds.length} metrics</span>
              {topTakeaway && (
                <span className="hidden text-ink-soft sm:inline">
                  {' · '}
                  <span className="font-medium text-ink">{topTakeaway.figure}</span>{' '}
                  {topTakeaway.sub}
                </span>
              )}
            </div>
            <div
              className="flex shrink-0 items-center rounded-control border border-line"
              role="group"
              aria-label="Card density"
            >
              {[
                ['comfortable', 'Comfort'],
                ['compact', 'Compact'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDensity(mode)}
                  aria-pressed={density === mode}
                  className={
                    'rounded-control px-2xs py-2xs text-caption transition-colors ' +
                    (density === mode
                      ? 'bg-accent/15 font-medium text-ink'
                      : 'text-ink-faint hover:text-ink-soft')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero takeaway callouts across the top */}
        {takeaways.length > 0 && (
          <div className={`grid ${cardGap} sm:grid-cols-3`}>
            {takeaways.map((t, i) => (
              <div key={i} className={`rounded-card bg-surface-raised shadow-card ${heroPad}`}>
                <div className="text-body font-medium text-ink">{t.figure}</div>
                <div className="mt-2xs text-caption leading-snug text-ink-soft">{t.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* One card per selected metric — live on every tap, reorderable */}
        <div className={`mt-sm grid ${cardGap}`}>
          {orderedDefs.map((def, idx) => (
            <div
              key={def.id}
              draggable
              onDragStart={(e) => {
                setDragId(def.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropOn(def.id)}
              onDragEnd={() => setDragId(null)}
              className={dragId === def.id ? 'opacity-40' : ''}
            >
              <MetricCard
                def={def}
                tickers={tickers}
                density={density}
                onMoveUp={() => moveCard(def.id, -1)}
                onMoveDown={() => moveCard(def.id, 1)}
                isFirst={idx === 0}
                isLast={idx === orderedDefs.length - 1}
              />
            </div>
          ))}
        </div>

        {orderedDefs.length === 0 && (
          <p className="text-caption italic text-ink-faint">
            No metrics have data for this company set.
          </p>
        )}
      </main>
    </div>
  )
}
