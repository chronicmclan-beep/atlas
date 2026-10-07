import { useEffect, useMemo, useState } from 'react'
import {
  FAMILIES,
  METRICS,
  resolveFigure,
  availableMetrics,
  describeGap,
} from '../../lib/compareMetrics.js'
import { parseScalar, sparkPath } from '../../lib/compareVisual.js'
import { getCompany, revenue as quarterlyRevenue } from '../../lib/data.js'
import CompanyBadge from '../../components/common/CompanyBadge.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'

/*
  Lab variant — "Focus" for the Company Comparison builder.

  The opposite of the Command Deck: radically calm. ONE metric at a time,
  rendered huge in the design element native to its family, with almost no
  chrome. A collapsible left menu (slides to a 48px icon rail; overlay
  drawer on mobile) holds companies + the metric list. The stage shows a
  single big visual, a prev/next metric navigator, small company chips,
  and an info button that opens the 4-layer explanation.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. A metric appears only with coverage for the
  current ticker set. The stage is never empty: the last company cannot
  be deselected, and the navigator always has a metric to show.
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
const DEFAULT_METRIC = 'revenue'

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

/* ------------------------------------------------------------------ */
/* Explain panel — the 4 layers + per-figure sources (info modal body)  */
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
      <div className="grid gap-md sm:grid-cols-2">
        {layers.map(([title, body]) => (
          <div key={title}>
            <div className="text-eyebrow uppercase text-ink-faint">{title}</div>
            <p className="mt-2xs text-body text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
      {withVal.length > 0 && (
        <div className="mt-md grid gap-2xs border-t border-line/60 pt-sm">
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
/* Big donut — Size & scale metrics. Share across selected companies.    */
/* ------------------------------------------------------------------ */

function BigDonut({ entries, lead }) {
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
    <div className="flex flex-col items-center gap-lg sm:flex-row sm:gap-xl">
      <div className="relative h-72 w-72 shrink-0 sm:h-96 sm:w-96">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Relative share donut">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="16" className="stroke-line" opacity="0.3" />
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
                strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={off}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="font-semibold leading-tight text-ink text-title">{leader?.fig?.value?.split(' ')[0]}</span>
          <span className="leading-tight text-ink-faint text-label">{leader?.ticker} leads</span>
        </div>
      </div>
      <ul className="grid w-full min-w-0 max-w-sm gap-sm">
        {scored.map((s) => (
          <li key={s.e.ticker} className="flex items-center gap-sm text-body">
            <CompanyBadge name={s.e.ticker} size={26} />
            <span className="truncate font-medium" style={{ color: colorOf(s.e.ticker) }}>
              {nameOf(s.e.ticker)}
            </span>
            <span className="truncate text-ink-soft">{s.e.fig.value}</span>
            <span className="ml-auto shrink-0 font-medium text-ink">{((s.v / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Big radial gauges — margins & returns, one per company.              */
/* ------------------------------------------------------------------ */

function BigGauges({ entries }) {
  return (
    <div className="grid w-full grid-cols-2 gap-md sm:gap-lg">
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
          <div
            key={e.ticker}
            className="flex flex-col items-center rounded-card bg-surface-raised px-sm py-md"
          >
            <svg viewBox="0 0 120 76" className="w-full max-w-64" role="img" aria-label={`${e.ticker} gauge`}>
              <path
                d="M12,60 A48,48 0 0 1 108,60"
                fill="none"
                strokeWidth="10"
                className="stroke-line"
                opacity="0.35"
                strokeLinecap="round"
              />
              {arc && (
                <path d={arc} fill="none" stroke={colorOf(e.ticker)} strokeWidth="10" strokeLinecap="round" />
              )}
            </svg>
            <div className="-mt-4 text-center">
              <div className="flex items-center justify-center gap-xs">
                <CompanyBadge name={e.ticker} size={20} />
                <span className="font-medium text-label" style={{ color: colorOf(e.ticker) }}>
                  {nameOf(e.ticker)}
                </span>
              </div>
              <div className="font-semibold text-ink text-title">
                {e.fig ? (
                  e.fig.value.split(' ')[0]
                ) : (
                  <span className="italic text-ink-faint">Not sourced</span>
                )}
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
/* Big bars — the fallback and growth visual. One row per company.      */
/* ------------------------------------------------------------------ */

function BigBars({ entries, lead }) {
  const scalars = entries.map((e) => parseScalar(e.fig?.value))
  const max = Math.max(...scalars.map((v) => Math.abs(v ?? 0)), 1e-9)
  return (
    <div className="grid w-full gap-md">
      {entries.map((e, i) => {
        const v = scalars[i]
        return (
          <div key={e.ticker} className="flex items-center gap-sm">
            <span className="flex w-36 shrink-0 items-center gap-xs">
              <CompanyBadge name={e.ticker} size={24} />
              <span className="truncate font-medium text-body" style={{ color: colorOf(e.ticker) }}>
                {nameOf(e.ticker)}
              </span>
            </span>
            {e.fig && v != null ? (
              <>
                <div className="h-6 min-w-6 flex-1 overflow-hidden rounded-pill bg-surface-raised">
                  <div
                    className="h-full rounded-pill transition-all duration-500"
                    style={{ width: `${Math.max(2, (Math.abs(v) / max) * 100)}%`, background: colorOf(e.ticker) }}
                  />
                </div>
                <span className="max-w-[36%] shrink-0 text-right text-body leading-tight text-ink">
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
              <span className="flex-1 italic text-ink-faint text-body">
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
/* Dot-on-scale — valuation multiples. Dots on a shared axis.           */
/* ------------------------------------------------------------------ */

function DotScale({ entries }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
  if (scored.length < 2) return null
  const vals = scored.map((s) => s.v)
  const lo0 = Math.min(...vals)
  const hi0 = Math.max(...vals)
  const pad = (hi0 - lo0) * 0.18 || 1
  const lo = lo0 - pad
  const hi = hi0 + pad
  const pos = (v) => ((v - lo) / (hi - lo)) * 100
  return (
    <div className="w-full px-sm py-lg">
      <div className="relative h-36">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-surface-raised" />
        {scored.map((s, i) => {
          const left = pos(s.v)
          const above = i % 2 === 0
          return (
            <div key={s.e.ticker} className="absolute top-0 h-full" style={{ left: `${left}%` }}>
              <div
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface"
                style={{ background: colorOf(s.e.ticker) }}
              />
              <div
                className={
                  'absolute -translate-x-1/2 whitespace-nowrap text-center ' +
                  (above ? 'bottom-[58%]' : 'top-[58%]')
                }
              >
                <div className="font-semibold text-ink text-body">{s.e.fig.value}</div>
                <div className="flex items-center justify-center gap-2xs text-caption">
                  <CompanyBadge name={s.e.ticker} size={14} />
                  <span className="font-medium" style={{ color: colorOf(s.e.ticker) }}>
                    {s.e.ticker}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-xs flex justify-between text-caption text-ink-faint">
        <span>{lo0 === hi0 ? '' : `Lower ← ${lo0}`}</span>
        <span>{lo0 === hi0 ? '' : `→ Higher ${hi0}`}</span>
      </div>
      <p className="mt-sm text-center text-caption text-ink-faint">
        Multiples are not ranked — a higher or lower value is not inherently better.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cash flow — revenue → operating cash flow → capex → free cash flow,  */
/* per company. Capex is an outflow (red).                             */
/* ------------------------------------------------------------------ */

const FLOW_STEPS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'ocf', label: 'Operating cash flow' },
  { id: 'capex', label: 'Capex (outflow)' },
  { id: 'fcf', label: 'Free cash flow' },
]

function CashFlow({ tickers }) {
  const rows = tickers.map((ticker) => ({
    ticker,
    figs: FLOW_STEPS.map((s) => resolveFigure(s.id, ticker)),
  }))
  const allVals = rows.flatMap((r) => r.figs.map((f) => Math.abs(parseScalar(f?.value) ?? 0)))
  const max = Math.max(...allVals, 1e-9)
  return (
    <div className="grid w-full gap-lg">
      {rows.map(({ ticker, figs }) => (
        <div key={ticker} className="rounded-card bg-surface-raised p-md">
          <div className="mb-sm flex items-center gap-xs">
            <CompanyBadge name={ticker} size={22} />
            <span className="font-medium text-body" style={{ color: colorOf(ticker) }}>
              {nameOf(ticker)}
            </span>
          </div>
          <div className="grid gap-xs">
            {FLOW_STEPS.map((step, i) => {
              const fig = figs[i]
              const v = parseScalar(fig?.value)
              const isCapex = step.id === 'capex'
              return (
                <div key={step.id} className="flex items-center gap-sm">
                  <span className="w-40 shrink-0 truncate text-caption text-ink-soft">{step.label}</span>
                  {fig && v != null ? (
                    <>
                      <div className="h-5 min-w-6 flex-1 overflow-hidden rounded-pill bg-surface">
                        <div
                          className="h-full rounded-pill transition-all duration-500"
                          style={{
                            width: `${Math.max(2, (Math.abs(v) / max) * 100)}%`,
                            background: isCapex ? '#E5484D' : colorOf(ticker),
                          }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-body text-ink">{fig.value}</span>
                      <SourceTag tier={fig.tier} showLabel={false} />
                    </>
                  ) : (
                    <span className="flex-1 italic text-caption text-ink-faint">Not sourced</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-center text-caption text-ink-faint">
        Free cash flow = operating cash flow − capex.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 18-quarter revenue trend — the growth story, for tickers with data.  */
/* ------------------------------------------------------------------ */

function TrendChart({ tickers }) {
  const quarters = quarterlyRevenue.quarters ?? []
  const series = useMemo(
    () =>
      tickers
        .map((t) => quarterlyRevenue.series.find((s) => s.ticker === t))
        .filter(Boolean),
    [tickers],
  )
  if (series.length === 0) return null
  const W = 800
  const H = 300
  const labelIdx = [0, 5, 11, quarters.length - 1].filter((i) => i < quarters.length)
  const allVals = series.flatMap((s) => s.revenue)
  const maxV = Math.max(...allVals)
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full" role="img" aria-label="Quarterly revenue trend">
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = 20 + (1 - f) * (H - 40)
          return (
            <g key={f}>
              <line x1="60" x2={W - 10} y1={y} y2={y} className="stroke-line" strokeWidth="1" opacity="0.4" />
              <text x="52" y={y + 4} textAnchor="end" className="fill-ink-faint" fontSize="12">
                ${(maxV * f).toFixed(0)}B
              </text>
            </g>
          )
        })}
        {series.map((s) => (
          <g key={s.ticker} transform="translate(60,20)">
            <path
              d={sparkPath(s.revenue, W - 70, H - 40)}
              fill="none"
              stroke={colorOf(s.ticker)}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ))}
        {labelIdx.map((i) => {
          const x = 60 + (i / (quarters.length - 1)) * (W - 70)
          return (
            <text key={i} x={x} y={H + 28} textAnchor="middle" className="fill-ink-faint" fontSize="13">
              {quarters[i]}
            </text>
          )
        })}
      </svg>
      <div className="mt-xs flex flex-wrap justify-center gap-md">
        {series.map((s) => (
          <span key={s.ticker} className="flex items-center gap-2xs text-body">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s.ticker) }} />
            <span className="font-medium" style={{ color: colorOf(s.ticker) }}>
              {s.ticker}
            </span>
            <span className="text-ink-soft">${s.revenue[s.revenue.length - 1].toFixed(2)}B</span>
          </span>
        ))}
      </div>
      <p className="mt-sm text-center text-caption text-ink-faint">
        Reported quarterly revenue, US$ billions · Fiscal and calendar quarters are not strictly aligned across
        companies.
      </p>
    </div>
  )
}

/* One place that picks the native visual for a metric. */
function FocusVisual({ def, tickers }) {
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const lead = leaderIndex(def, entries)
  if (withVal.length === 0) {
    return (
      <p className="text-center italic text-ink-faint text-body">
        No data for these companies — listed, not hidden.
      </p>
    )
  }

  if (def.family === 'size') {
    const donut = <BigDonut entries={entries} lead={lead} />
    return donut ?? <BigBars entries={entries} lead={lead} />
  }
  if (def.family === 'profitability' || def.family === 'returns') {
    return <BigGauges entries={entries} />
  }
  if (def.family === 'growth') {
    if (def.id === 'rev-cagr-5y') {
      const hasAll = tickers.every((t) => quarterlyRevenue.series.some((s) => s.ticker === t))
      if (hasAll) return <TrendChart tickers={tickers} />
    }
    return <BigBars entries={entries} lead={lead} />
  }
  if (def.family === 'cash' && (def.id === 'ocf' || def.id === 'fcf')) {
    return <CashFlow tickers={tickers} />
  }
  if (def.family === 'valuation' && def.higherIsBetter == null) {
    const scale = <DotScale entries={entries} />
    return scale ?? <BigBars entries={entries} lead={lead} />
  }
  return <BigBars entries={entries} lead={lead} />
}

/* ------------------------------------------------------------------ */
/* Menu panel — companies + metric list (shared by desktop + mobile).   */
/* ------------------------------------------------------------------ */

function MenuPanel({ tickers, onToggleTicker, metricId, onSelectMetric, query, onQuery }) {
  const [openFamily, setOpenFamily] = useState(null)
  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const activeDef = METRICS.find((m) => m.id === metricId)

  useEffect(() => {
    if (activeDef) setOpenFamily(activeDef.family)
  }, [metricId]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase()
  const shownGroups = GROUPS.map((g) => ({
    ...g,
    tickers: g.tickers.filter((t) => !q || t.toLowerCase().includes(q) || nameOf(t).toLowerCase().includes(q)),
  })).filter((g) => g.tickers.length > 0)

  return (
    <div className="flex h-full w-64 flex-col">
      <div className="border-b border-line/60 p-sm">
        <div className="text-eyebrow uppercase text-ink-faint">Companies · {tickers.length}/{MAX_COMPANIES}</div>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search companies…"
          aria-label="Search companies"
          className="mt-xs w-full rounded-control border border-line bg-surface px-sm py-2xs text-label text-ink placeholder:text-ink-faint"
        />
        <div className="mt-sm grid max-h-56 gap-md overflow-y-auto pr-2xs">
          {shownGroups.map((g) => (
            <div key={g.label}>
              <div className="mb-2xs text-caption font-medium text-ink-faint">{g.label}</div>
              <div className="flex flex-wrap gap-2xs">
                {g.tickers.map((t) => {
                  const on = tickers.includes(t)
                  const lastOne = on && tickers.length === 1
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onToggleTicker(t)}
                      disabled={(!on && tickers.length >= MAX_COMPANIES) || lastOne}
                      aria-pressed={on}
                      title={lastOne ? 'At least one company is required' : nameOf(t)}
                      className={
                        'flex items-center gap-2xs rounded-pill border px-2xs py-2xs text-caption transition-all ' +
                        (on
                          ? 'border-transparent font-medium text-white'
                          : 'border-line text-ink-soft hover:border-ink-faint') +
                        ((!on && tickers.length >= MAX_COMPANIES) || lastOne ? ' cursor-default opacity-40' : '')
                      }
                      style={on ? { background: colorOf(t), borderColor: colorOf(t) } : undefined}
                    >
                      <CompanyBadge name={t} size={14} />
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-sm">
        <div className="text-eyebrow uppercase text-ink-faint">Metric</div>
        <div className="mt-xs grid gap-2xs">
          {FAMILIES.map((f) => {
            const fams = avail.filter((m) => m.family === f.id)
            if (fams.length === 0) return null
            const open = openFamily === f.id
            return (
              <div key={f.id}>
                <button
                  type="button"
                  onClick={() => setOpenFamily(open ? null : f.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-control px-2xs py-2xs text-left text-label text-ink-soft hover:bg-surface-hover"
                >
                  <span>{f.label}</span>
                  <span className="text-caption text-ink-faint">
                    {fams.length} <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                  </span>
                </button>
                {open && (
                  <div className="grid gap-2xs py-2xs pl-sm">
                    {fams.map((m) => {
                      const active = m.id === metricId
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onSelectMetric(m.id)}
                          aria-current={active}
                          className={
                            'rounded-control px-sm py-xs text-left text-label transition-colors ' +
                            (active
                              ? 'bg-accent/15 font-medium text-ink'
                              : 'text-ink-soft hover:bg-surface-hover')
                          }
                        >
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* CompareFocus — one metric, huge, minimal chrome.                     */
/* ------------------------------------------------------------------ */

export default function CompareFocus() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricId, setMetricId] = useState(DEFAULT_METRIC)
  const [menuOpen, setMenuOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  )
  const [infoOpen, setInfoOpen] = useState(false)
  const [query, setQuery] = useState('')

  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const def = useMemo(
    () => avail.find((m) => m.id === metricId) ?? avail[0] ?? METRICS[0],
    [avail, metricId],
  )
  const idx = avail.findIndex((m) => m.id === def.id)
  const go = (dir) => {
    if (avail.length === 0) return
    setMetricId(avail[(idx + dir + avail.length) % avail.length].id)
  }
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])

  const toggleTicker = (t) => {
    setTickers((prev) => {
      if (prev.includes(t)) return prev.length === 1 ? prev : prev.filter((x) => x !== t)
      return prev.length >= MAX_COMPANIES ? prev : [...prev, t]
    })
  }

  const menuProps = {
    tickers,
    onToggleTicker: toggleTicker,
    metricId: def.id,
    onSelectMetric: setMetricId,
    query,
    onQuery: setQuery,
  }

  return (
    <div className="flex min-h-[70vh]">
      {/* ---- Desktop: collapsible side menu (animated width) ---- */}
      <div className="hidden shrink-0 md:flex">
        {/* icon rail — always visible */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-sm border-r border-line/60 bg-surface py-sm">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Collapse menu' : 'Open menu'}
            aria-expanded={menuOpen}
            title={menuOpen ? 'Collapse menu' : 'Open menu'}
            className="rounded-control p-2xs text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <span aria-hidden="true" className="text-body">{menuOpen ? '‹' : '›'}</span>
          </button>
          <div className="grid gap-2xs">
            {tickers.map((t) => (
              <span
                key={t}
                title={nameOf(t)}
                className="h-3 w-3 rounded-full"
                style={{ background: colorOf(t) }}
              />
            ))}
          </div>
        </div>
        {/* sliding panel */}
        <div
          className={`overflow-hidden border-r border-line/60 bg-surface transition-[width] duration-300 ease-in-out ${
            menuOpen ? 'w-64' : 'w-0 border-r-0'
          }`}
        >
          <MenuPanel {...menuProps} />
        </div>
      </div>

      {/* ---- Mobile: overlay drawer ---- */}
      <div className={`fixed inset-0 z-40 md:hidden ${menuOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`absolute left-0 top-0 h-full bg-surface shadow-card transition-transform duration-300 ease-in-out ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Comparison menu"
        >
          <div className="flex items-center justify-between border-b border-line/60 p-sm">
            <span className="text-label font-medium text-ink">Compare</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="rounded-control p-2xs text-ink-soft hover:bg-surface-hover"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div className="h-[calc(100%-53px)]">
            <MenuPanel {...menuProps} />
          </div>
        </aside>
      </div>

      {/* ---- Stage ---- */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* slim top bar */}
        <div className="flex items-center gap-xs border-b border-line/60 px-sm py-xs">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-control p-2xs text-ink-soft hover:bg-surface-hover md:hidden"
          >
            <span aria-hidden="true" className="text-body">☰</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2xs overflow-x-auto">
            {tickers.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTicker(t)}
                disabled={tickers.length === 1}
                title={tickers.length === 1 ? 'At least one company is required' : `Remove ${nameOf(t)}`}
                className="flex shrink-0 items-center gap-2xs rounded-pill border border-line px-2xs py-2xs text-caption text-ink-soft transition-colors hover:border-ink-faint"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(t) }} />
                {t}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2xs">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous metric"
              className="rounded-control p-2xs text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <span className="max-w-44 truncate text-center text-label font-medium text-ink sm:max-w-xs">
              {def.label}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next metric"
              className="rounded-control p-2xs text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label={`About ${def.label}`}
              title="What is this metric?"
              className="ml-2xs flex h-6 w-6 items-center justify-center rounded-full border border-line text-caption text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
            >
              <span aria-hidden="true">i</span>
            </button>
          </div>
        </div>

        {/* the one big visual */}
        <div className="flex min-h-[52vh] flex-1 items-center justify-center overflow-y-auto p-md sm:p-xl">
          <div key={def.id + tickers.join(',')} className="w-full max-w-4xl">
            <FocusVisual def={def} tickers={tickers} />
          </div>
        </div>
      </main>

      {/* ---- Info modal: 4-layer explanation ---- */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md" role="dialog" aria-modal="true" aria-label={`About ${def.label}`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setInfoOpen(false)} aria-hidden="true" />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card bg-surface p-md shadow-card sm:p-lg">
            <div className="mb-sm flex items-start justify-between gap-sm">
              <h3 className="text-heading font-medium text-ink">{def.label}</h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label="Close"
                className="shrink-0 rounded-control p-2xs text-ink-soft hover:bg-surface-hover"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <ExplainPanel def={def} figs={figs} />
          </div>
        </div>
      )}
    </div>
  )
}
