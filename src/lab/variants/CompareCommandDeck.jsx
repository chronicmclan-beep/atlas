import { useEffect, useMemo, useState } from 'react'
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
  Lab variant — "Command Deck" for the Company Comparison builder.

  Layout idea: the page is a workspace, not a settings page. A slim left
  menu (~240px, collapsible; a drawer on mobile) holds presets + companies.
  The remaining ~80% is one big central stage: a sticky header, a metric
  ribbon (large tappable tiles grouped by family — the primary metric
  picker), hero takeaway callouts, and the selected metrics as LARGE cards
  in a 2-up grid with room for proper charts. Any card expands into a
  full-stage focus modal: big chart on one side, the 4-layer explanation
  and sources on the other.

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
    <div>
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
/* large=true gives ~2x chart presence for the deck cards + focus mode.  */
/* ------------------------------------------------------------------ */

function BarPairs({ entries, lead, large = false }) {
  const scalars = entries.map((e) => parseScalar(e.fig?.value))
  const max = Math.max(...scalars.map((v) => Math.abs(v ?? 0)), 1e-9)
  return (
    <div className={'grid ' + (large ? 'gap-sm' : 'mt-xs gap-2xs')}>
      {entries.map((e, i) => {
        const v = scalars[i]
        return (
          <div key={e.ticker} className="flex items-center gap-xs">
            <span className={'flex shrink-0 items-center gap-2xs ' + (large ? 'w-32' : 'w-24')}>
              <CompanyBadge name={e.ticker} size={large ? 22 : 18} />
              <span
                className={'truncate font-medium ' + (large ? 'text-label' : 'text-caption')}
                style={{ color: colorOf(e.ticker) }}
              >
                {e.ticker}
              </span>
            </span>
            {e.fig && v != null ? (
              <>
                <div
                  className={
                    'min-w-6 flex-1 overflow-hidden rounded-pill bg-surface-raised ' +
                    (large ? 'h-5' : 'h-3')
                  }
                >
                  <div
                    className="h-full rounded-pill transition-all duration-500"
                    style={{ width: `${Math.max(2, (Math.abs(v) / max) * 100)}%`, background: colorOf(e.ticker) }}
                  />
                </div>
                <span
                  className={
                    'shrink-0 text-right leading-tight text-ink ' +
                    (large ? 'max-w-[34%] text-body' : 'max-w-[38%] text-caption')
                  }
                >
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
/* Donut for size/share metrics — large=true for deck cards + focus.    */
/* ------------------------------------------------------------------ */

function DonutChart({ entries, lead, large = false }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null && s.v > 0)
  if (scored.length === 0) return null
  const total = scored.reduce((a, s) => a + s.v, 0)
  const R = 46
  const C = 2 * Math.PI * R
  let acc = 0
  const leader = lead >= 0 ? entries[lead] : scored.reduce((a, b) => (b.v > a.v ? b : a)).e
  return (
    <div className={'flex items-center ' + (large ? 'gap-lg' : 'mt-xs gap-md')}>
      <div className={'relative shrink-0 ' + (large ? 'h-52 w-52' : 'h-32 w-32')}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Relative share donut">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="18" className="stroke-line" opacity="0.3" />
          {scored.map((s) => {
            const frac = s.v / total
            const len = Math.max(0, frac * C - 1.5)
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
          <span className={'font-semibold leading-tight text-ink ' + (large ? 'text-title' : 'text-label')}>
            {leader?.fig?.value?.split(' ')[0]}
          </span>
          <span className={'leading-tight text-ink-faint ' + (large ? 'text-label' : 'text-caption')}>
            {leader?.ticker} leads
          </span>
        </div>
      </div>
      <ul className="grid min-w-0 flex-1 gap-2xs">
        {scored.map((s) => (
          <li key={s.e.ticker} className={'flex items-center gap-xs ' + (large ? 'text-label' : 'text-caption')}>
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

/* ------------------------------------------------------------------ */
/* Radial gauges for margins/returns — large=true for deck + focus.     */
/* ------------------------------------------------------------------ */

function GaugeChart({ entries, large = false }) {
  return (
    <div className={'grid grid-cols-2 gap-sm ' + (large ? 'sm:grid-cols-4' : 'sm:grid-cols-4')}>
      {entries.map((e) => {
        const v = parseScalar(e.fig?.value)
        const frac = v == null ? null : Math.min(1, Math.max(0, v / 100))
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
            <svg
              viewBox="0 0 120 76"
              className={'w-full ' + (large ? 'max-w-52' : 'max-w-32')}
              role="img"
              aria-label={`${e.ticker} gauge`}
            >
              <path d="M12,60 A48,48 0 0 1 108,60" fill="none" strokeWidth="9" className="stroke-line" opacity="0.35" strokeLinecap="round" />
              {arc && <path d={arc} fill="none" stroke={colorOf(e.ticker)} strokeWidth="9" strokeLinecap="round" />}
            </svg>
            <div className="-mt-3 text-center">
              <div className="flex items-center justify-center gap-2xs">
                <CompanyBadge name={e.ticker} size={large ? 18 : 14} />
                <span
                  className={'font-medium ' + (large ? 'text-label' : 'text-caption')}
                  style={{ color: colorOf(e.ticker) }}
                >
                  {e.ticker}
                </span>
              </div>
              <div className={'font-semibold text-ink ' + (large ? 'text-title' : 'text-label')}>
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

/* One place that picks the visual for a metric — shared by card + focus. */
function MetricVisual({ def, entries, lead, large, chartMode }) {
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  if (withVal.length === 0) {
    return (
      <p className="text-caption italic text-ink-faint">
        No data for these companies — listed, not hidden.
      </p>
    )
  }
  const native = nativeChartFor(def)
  const showDonut =
    chartMode === 'native' && native === 'donut' && entries.some((e) => (parseScalar(e.fig?.value) ?? 0) > 0)
  const showGauge = chartMode === 'native' && native === 'gauge'
  if (showDonut) return <DonutChart entries={entries} lead={lead} large={large} />
  if (showGauge) return <GaugeChart entries={entries} large={large} />
  return <BarPairs entries={entries} lead={lead} large={large} />
}

/* ------------------------------------------------------------------ */
/* Deck card — large metric card on the stage. Tap-to-inspect, chart     */
/* switcher, expand-to-focus, reorder arrows.                           */
/* ------------------------------------------------------------------ */

function DeckCard({ def, tickers, density, onMoveUp, onMoveDown, isFirst, isLast, onExpand }) {
  const [open, setOpen] = useState(false)
  const [chartMode, setChartMode] = useState('bars') // 'bars' | 'native'
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const lead = leaderIndex(def, entries)
  const missing = entries.filter((e) => !e.fig || e.fig.value == null).map((e) => e.ticker)
  const native = nativeChartFor(def)

  const pad = density === 'compact' ? 'p-2xs' : 'p-sm'

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
    <div className="flex h-full flex-col rounded-card bg-surface shadow-card">
      <div className={'flex items-center gap-2xs border-b border-line/60 ' + pad}>
        <span className="shrink-0 cursor-grab text-ink-faint" title="Drag to reorder" aria-hidden="true">
          ⋮⋮
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-sm text-left"
        >
          <span className="truncate text-heading font-medium text-ink">{def.label}</span>
          <Chevron open={open} />
        </button>
        {native && withVal.length > 0 && (
          <span className="flex shrink-0 items-center rounded-control border border-line">
            {switchBtn('bars', 'Bars')}
            {switchBtn('native', NATIVE_LABEL[native])}
          </span>
        )}
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Expand ${def.label} to full stage`}
          title="Expand to full stage"
          className="shrink-0 rounded-control px-2xs text-caption text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <span aria-hidden="true">⤢</span>
        </button>
        {arrowBtn(onMoveUp, -1, isFirst, `Move ${def.label} up`)}
        {arrowBtn(onMoveDown, 1, isLast, `Move ${def.label} down`)}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={'block w-full flex-1 text-left ' + pad}
      >
        <MetricVisual def={def} entries={entries} lead={lead} large chartMode={chartMode} />
        <span className="mt-sm block text-label leading-snug text-ink-soft">{describeGap(def, figs)}</span>
        {missing.length > 0 && (
          <span className="mt-2xs block text-caption italic text-ink-faint">
            Not sourced for: {missing.join(', ')}
          </span>
        )}
      </button>
      {open && (
        <div className={'border-t border-line/60 ' + pad}>
          <ExplainPanel def={def} figs={figs} />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Focus mode — full-stage modal: big chart beside the explanation.     */
/* ------------------------------------------------------------------ */

function FocusModal({ def, tickers, onClose }) {
  const [chartMode, setChartMode] = useState('bars')
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const lead = leaderIndex(def, entries)
  const native = nativeChartFor(def)
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-sm" role="dialog" aria-modal="true" aria-label={`${def.label} — full stage`}>
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-card bg-bg p-md shadow-card">
        <div className="flex items-center justify-between gap-sm">
          <h3 className="text-title font-medium text-ink">{def.label}</h3>
          <div className="flex shrink-0 items-center gap-2xs">
            {native && withVal.length > 0 && (
              <span className="flex items-center rounded-control border border-line">
                {['bars', 'native'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    aria-pressed={chartMode === mode}
                    className={
                      'rounded-control px-2xs py-2xs text-caption transition-colors ' +
                      (chartMode === mode
                        ? 'bg-accent/15 font-medium text-ink'
                        : 'text-ink-faint hover:text-ink-soft')
                    }
                  >
                    {mode === 'bars' ? 'Bars' : NATIVE_LABEL[native]}
                  </button>
                ))}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close full stage view"
              className="rounded-control px-xs py-2xs text-label text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
        <div className="mt-md grid gap-md lg:grid-cols-2">
          <div>
            <MetricVisual def={def} entries={entries} lead={lead} large chartMode={chartMode} />
            <p className="mt-sm text-label leading-snug text-ink-soft">{describeGap(def, figs)}</p>
          </div>
          <div className="rounded-card bg-surface p-sm">
            <ExplainPanel def={def} figs={figs} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metric ribbon — the primary metric picker. Horizontal strip of       */
/* large tappable tiles, family filter on top, live coverage counts.    */
/* ------------------------------------------------------------------ */

function MetricRibbon({ metricIds, toggleMetric, coveredIds, tickers }) {
  const [famFilter, setFamFilter] = useState('all')
  const avail = availableMetrics(GROUPS.flatMap((g) => g.tickers)).filter((m) =>
    coveredIds.includes(m.id)
  )
  const fams = FAMILIES.filter((f) => avail.some((m) => m.family === f.id))
  const shown = famFilter === 'all' ? avail : avail.filter((m) => m.family === famFilter)
  const famLabel = (fid) => FAMILIES.find((f) => f.id === fid)?.label ?? fid

  const famChip = (id, label, count) => {
    const active = famFilter === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => setFamFilter(id)}
        aria-pressed={active}
        className={
          'shrink-0 rounded-pill border px-xs py-2xs text-caption transition-colors ' +
          (active
            ? 'border-transparent bg-accent/15 font-medium text-ink'
            : 'border-line text-ink-soft hover:bg-surface-hover')
        }
      >
        {label} · {count}
      </button>
    )
  }

  return (
    <section aria-label="Metric picker" className="rounded-card bg-surface p-sm shadow-card">
      <div className="flex items-center justify-between gap-sm">
        <span className="text-eyebrow uppercase text-ink-faint">
          Metrics · {metricIds.length} on stage
        </span>
        <span className="text-caption text-ink-faint">Tap a tile to add or remove it</span>
      </div>
      <div className="mt-xs flex gap-2xs overflow-x-auto pb-2xs">
        {famChip('all', 'All', avail.length)}
        {fams.map((f) => {
          const n = avail.filter((m) => m.family === f.id).length
          return famChip(f.id, f.label, n)
        })}
      </div>
      <div className="mt-xs flex snap-x gap-sm overflow-x-auto pb-xs">
        {shown.map((m) => {
          const active = metricIds.includes(m.id)
          const cov = coverage(m.id, tickers)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMetric(m.id)}
              aria-pressed={active}
              className={
                'w-40 shrink-0 snap-start rounded-control border p-xs text-left transition-colors ' +
                (active
                  ? 'border-accent bg-accent/10 shadow-card'
                  : 'border-line bg-bg hover:border-ink-faint')
              }
            >
              <div className="flex items-center justify-between gap-2xs">
                <span className={'text-label font-medium ' + (active ? 'text-ink' : 'text-ink-soft')}>
                  {m.label}
                </span>
                {active && (
                  <span aria-hidden="true" className="text-caption text-accent">
                    ✓
                  </span>
                )}
              </div>
              <div className="mt-2xs text-caption text-ink-faint">{famLabel(m.family)}</div>
              <div className="mt-2xs text-caption text-ink-faint">
                {cov} of {tickers.length} companies
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Company menu — presets + searchable grouped company list.            */
/* Lives in the slim side menu (and the mobile drawer).                */
/* ------------------------------------------------------------------ */

function CompanyMenu({ tickers, toggleTicker, activePreset, applyPreset }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (t) => !q || t.toLowerCase().includes(q) || nameOf(t).toLowerCase().includes(q)

  return (
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
      <div>
        <div className="text-eyebrow uppercase text-ink-faint">
          Companies · {tickers.length}/{MAX_COMPANIES}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          aria-label="Search companies"
          className="mt-xs w-full rounded-control border border-line bg-bg px-xs py-2xs text-caption text-ink placeholder:text-ink-faint"
        />
        {GROUPS.map((g) => {
          const list = g.tickers.filter(matches)
          if (list.length === 0) return null
          return (
            <div key={g.label} className="mt-xs">
              <div className="text-caption font-medium text-ink-soft">{g.label}</div>
              <div className="mt-2xs flex flex-wrap gap-2xs">
                {list.map((t) => {
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
          )
        })}
        {q && GROUPS.every((g) => g.tickers.filter(matches).length === 0) && (
          <span className="mt-xs block text-caption italic text-ink-faint">No companies match “{query.trim()}”.</span>
        )}
      </div>
      <div className="text-caption italic text-ink-faint">
        Experimental layout · figures carry their normal source tiers
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The variant — Command Deck                                          */
/* ------------------------------------------------------------------ */

export default function CompareCommandDeck() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricIds, setMetricIds] = useState(DEFAULT_METRICS)
  const [activePreset, setActivePreset] = useState('nvda-amd')
  const [density, setDensity] = useState('comfortable') // 'comfortable' | 'compact'
  const [order, setOrder] = useState(DEFAULT_METRICS) // stage card order (drag/arrows)
  const [dragId, setDragId] = useState(null)
  const [focusId, setFocusId] = useState(null) // metric id in focus mode, or null
  // md+: menu collapse. <md: pickers move into a top drawer.
  const [menuCollapsed, setMenuCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Metrics with data for the CURRENT selection — ribbon + stage only show these.
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

  // Stage order: keep the user's arrangement, append newly added metrics.
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
  const focusDef = focusId ? METRICS.find((m) => m.id === focusId) : null

  const menuContent = (
    <CompanyMenu
      tickers={tickers}
      toggleTicker={toggleTicker}
      activePreset={activePreset}
      applyPreset={applyPreset}
    />
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
          <div className="mt-2xs rounded-card bg-surface px-sm py-sm shadow-card">{menuContent}</div>
        )}
      </div>

      {/* ---- Desktop: slim collapsible side menu (md+) ---- */}
      {menuCollapsed ? (
        <aside className="hidden shrink-0 md:block">
          <button
            type="button"
            onClick={() => setMenuCollapsed(false)}
            aria-label="Open company menu"
            title="Open company menu"
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
        <aside className="hidden md:block md:w-60 md:shrink-0">
          <div className="rounded-card bg-surface px-sm py-sm shadow-card">
            <div className="mb-sm flex items-center justify-between">
              <span className="text-eyebrow uppercase text-ink-faint">Companies</span>
              <button
                type="button"
                onClick={() => setMenuCollapsed(true)}
                aria-label="Collapse company menu"
                title="Collapse company menu"
                className="rounded-control px-2xs text-ink-faint hover:bg-surface-hover"
              >
                <span aria-hidden="true">‹</span>
              </button>
            </div>
            {menuContent}
          </div>
        </aside>
      )}

      {/* ---- The stage (~80%) ---- */}
      <main className="min-w-0 flex-1">
        {/* Sticky stage header — selection + top takeaway + density toggle */}
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

        {/* Metric ribbon — the primary metric picker */}
        <MetricRibbon
          metricIds={metricIds}
          toggleMetric={toggleMetric}
          coveredIds={coveredIds}
          tickers={tickers}
        />

        {/* Hero takeaway callouts */}
        {takeaways.length > 0 && (
          <div className={`mt-sm grid grid-cols-1 ${cardGap} sm:grid-cols-3`}>
            {takeaways.map((t, i) => (
              <div key={i} className={`rounded-card bg-surface-raised shadow-card ${heroPad}`}>
                <div className="text-body font-medium text-ink">{t.figure}</div>
                <div className="mt-2xs text-caption leading-snug text-ink-soft">{t.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Large cards — 2-up on desktop, 1-up on mobile, reorderable */}
        <div className={`mt-sm grid grid-cols-1 ${cardGap} lg:grid-cols-2`}>
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
              <DeckCard
                def={def}
                tickers={tickers}
                density={density}
                onMoveUp={() => moveCard(def.id, -1)}
                onMoveDown={() => moveCard(def.id, 1)}
                isFirst={idx === 0}
                isLast={idx === orderedDefs.length - 1}
                onExpand={() => setFocusId(def.id)}
              />
            </div>
          ))}
        </div>

        {orderedDefs.length === 0 && (
          <p className="mt-sm text-caption italic text-ink-faint">
            No metrics have data for this company set.
          </p>
        )}
      </main>

      {/* Focus mode — full-stage modal */}
      {focusDef && (
        <FocusModal def={focusDef} tickers={tickers} onClose={() => setFocusId(null)} />
      )}
    </div>
  )
}
