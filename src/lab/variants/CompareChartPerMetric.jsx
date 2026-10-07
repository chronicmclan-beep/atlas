import { useMemo, useState } from 'react'
import {
  FAMILIES,
  METRICS,
  resolveFigure,
  coverage,
  describeGap,
  topTakeaways,
} from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { getCompany } from '../../lib/data.js'
import CompanyBadge from '../../components/common/CompanyBadge.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'

/*
  Lab variant — "Chart per metric" (Company Comparison experiment).

  Same pickers and data contract as the production Section 08 builder, but
  every metric renders in its NATIVE chart type instead of one bar style:

    size family (revenue, market-cap, ev…)      → donut of relative share
    profitability/returns % metrics            → radial gauge small-multiples
      (gross-margin, op-margin, net-margin, roe, roa)
    growth family                              → diverging bars from a 0% axis
    valuation family                           → dot-on-scale
    balance / cash / market families           → bar pairs (the shared fallback)
    'chips' visual or unparseable values        → text chips fallback

  Each card header carries a tiny native⇄bars switcher so the owner can flip
  any card between its native chart and the bar-pair fallback, and every card
  is tap-to-inspect: the 4-layer explanation panel expands under the chart.

  DATA RULES (same as production):
  - figures resolve ONLY via resolveFigure(metricId, ticker)
  - only metrics with coverage(metricId, tickers) > 0 appear in the picker
  - never invent a figure; unparseable values fall back to chips

  The shell provides the page header — this component renders pickers, the
  hero takeaway strip, and the metric stage.
*/

/* Company universe for the builder: 1–4 selectable, two grouped pools. */
const GROUPS = [
  { label: 'Chip Design', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'MRVL', 'ARM'] },
  { label: 'Compute Providers', tickers: ['MSFT', 'AMZN', 'GOOGL', 'Meta', 'Oracle', 'CRWV'] },
]
const MAX_COMPANIES = 4
const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const DEFAULT_METRICS = ['revenue', 'gross-margin', 'op-margin', 'net-income', 'fcf']

/* The percentage metrics that earn the radial gauge treatment. */
const GAUGE_IDS = new Set(['gross-margin', 'op-margin', 'net-margin', 'roe', 'roa'])

function colorOf(ticker) {
  return getCompany(ticker)?.color ?? '#888888'
}
function nameOf(ticker) {
  return getCompany(ticker)?.name ?? ticker
}

/** Which native chart a metric card uses. 'bars' is the shared fallback. */
function nativeChartFor(def) {
  if (def.visual === 'chips') return 'chips'
  if (def.family === 'size') return 'donut'
  if (GAUGE_IDS.has(def.id)) return 'gauge'
  if (def.family === 'growth') return 'diverge'
  if (def.family === 'valuation') return 'scale'
  return 'bars'
}

const NATIVE_LABEL = { donut: 'Donut', gauge: 'Gauge', diverge: 'Diverge', scale: 'Scale' }

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
/* Shared bits — leader marking + the 4-layer explanation panel          */
/* ------------------------------------------------------------------ */

/** Index of the leader among parseable figures (-1 = no ▲ marking). */
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

function ExplainPanel({ def, figs }) {
  const layers = [
    ['What it is', def.explain.what],
    ['Why it matters', def.explain.why],
    ['What good looks like', def.explain.good],
    ['What this result means', describeGap(def, figs)],
  ]
  const withVal = figs.filter((f) => f && f.value != null)
  return (
    <div className="mt-sm border-t border-line/60 px-sm py-sm">
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
/* Native charts                                                        */
/* ------------------------------------------------------------------ */

/** DONUT — size family. Relative share of the selected set, leader in the center. */
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

/** RADIAL GAUGE — one 0–100% arc per company, small-multiples grid. */
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

/** DIVERGING BARS — growth family. Bars grow from a 0% center axis, left = negative. */
function DivergeChart({ entries }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
  if (scored.length === 0) return null
  const maxAbs = Math.max(...scored.map((s) => Math.abs(s.v)), 1e-9)
  return (
    <div className="mt-xs grid gap-xs">
      {scored.map((s) => {
        const w = (Math.abs(s.v) / maxAbs) * 112 // half-width in a 240-wide row
        const right = s.v >= 0
        return (
          <div key={s.e.ticker} className="flex items-center gap-xs">
            <span className="flex w-24 shrink-0 items-center gap-2xs">
              <CompanyBadge name={s.e.ticker} size={16} />
              <span className="truncate text-caption font-medium" style={{ color: colorOf(s.e.ticker) }}>
                {s.e.ticker}
              </span>
            </span>
            <svg viewBox="0 0 240 20" className="h-5 min-w-0 flex-1" role="img" aria-label={`${s.e.ticker} ${s.e.fig.value}`}>
              <line x1="120" x2="120" y1="0" y2="20" className="stroke-line" strokeWidth="1.5" />
              <rect
                x={right ? 120 : 120 - w}
                y="5"
                width={Math.max(2, w)}
                height="10"
                rx="5"
                fill={colorOf(s.e.ticker)}
              />
            </svg>
            <span className="w-20 shrink-0 text-right text-caption text-ink">{s.e.fig.value.split(' ')[0]}</span>
            <SourceTag tier={s.e.fig.tier} showLabel={false} />
          </div>
        )
      })}
      <p className="text-caption text-ink-faint">Axis = 0% · bars scale to the largest absolute value.</p>
    </div>
  )
}

/** DOT-ON-SCALE — valuation family. Dots positioned across one shared axis. */
function ScaleChart({ entries, lead }) {
  const scored = entries
    .map((e, i) => ({ e, i, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
  if (scored.length === 0) return null
  let lo = Math.min(...scored.map((s) => s.v))
  let hi = Math.max(...scored.map((s) => s.v))
  if (hi === lo) {
    lo -= 1
    hi += 1 // degenerate guard: identical values still need a visible spread
  }
  const pad = (hi - lo) * 0.1
  lo -= pad
  hi += pad
  const W = 320
  const H = 104
  const L = 10
  const R = 10
  const y = 40
  const x = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R)
  const short = (str) => String(str).split(' ')[0]
  // Endpoint labels come from the entries holding the min and max values.
  const minEntry = scored.reduce((a, b) => (b.v < a.v ? b : a))
  const maxEntry = scored.reduce((a, b) => (b.v > a.v ? b : a))
  return (
    <div className="mt-xs px-2xs">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Dot-on-scale comparison">
        <line x1={L} x2={W - R} y1={y} y2={y} className="stroke-line" strokeWidth="2" strokeLinecap="round" />
        {[
          { pos: L, anchor: 'start', entry: minEntry },
          { pos: W - R, anchor: 'end', entry: maxEntry },
        ].map((t, k) => (
          <text key={k} x={t.pos} y={y + 44} textAnchor={t.anchor} fontSize="10" className="fill-ink-faint">
            {short(t.entry.e.fig.value)}
          </text>
        ))}
        {scored.map((s, k) => (
          <g key={s.e.ticker}>
            <circle cx={x(s.v)} cy={y} r="6.5" fill={colorOf(s.e.ticker)} stroke="var(--bg)" strokeWidth="2" />
            <text
              x={Math.min(Math.max(x(s.v), 46), W - 46)}
              y={k % 2 === 0 ? y - 16 : y + 30}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={colorOf(s.e.ticker)}
            >
              {s.e.ticker} {short(s.e.fig.value)}
              {lead === s.i ? ' ▲' : ''}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2xs flex items-center justify-end gap-xs">
        {scored.map((s) => (
          <SourceTag key={s.e.ticker} tier={s.e.fig.tier} showLabel={false} />
        ))}
      </div>
    </div>
  )
}

/** BAR PAIRS — the shared fallback (also the native chart for balance/cash/market). */
function BarRows({ entries, lead }) {
  const scalars = entries.map((e) => parseScalar(e.fig?.value))
  const max = Math.max(...scalars.map((v) => Math.abs(v ?? 0)), 1e-9)
  return (
    <div className="mt-xs grid gap-2xs">
      {entries.map((e, i) => {
        const v = scalars[i]
        return (
          <div key={e.ticker} className="flex items-center gap-xs rounded-control px-2xs py-2xs">
            <span className="flex w-28 shrink-0 items-center gap-2xs">
              <CompanyBadge name={e.ticker} size={18} />
              <span className="truncate text-caption font-medium" style={{ color: colorOf(e.ticker) }}>
                {nameOf(e.ticker)}
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
                    <span className="ml-2xs" aria-label="Highest value">
                      ▲
                    </span>
                  )}
                </span>
                <SourceTag tier={e.fig.tier} showLabel={false} />
              </>
            ) : (
              <span className="flex-1 text-caption italic text-ink-faint">Not sourced</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** TEXT CHIPS — for 'chips' visuals and for anything unparseable. */
function ChipList({ entries, lead }) {
  return (
    <div className="mt-xs flex flex-wrap gap-xs">
      {entries.map((e, i) => (
        <span
          key={e.ticker}
          className="inline-flex items-center gap-xs rounded-pill border border-line bg-surface-raised px-sm py-2xs text-caption text-ink"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: colorOf(e.ticker) }} />
          <span className="font-medium">{e.ticker}</span>
          {e.fig ? (
            <>
              {e.fig.value}
              {lead === i && <span aria-label="Highest value">▲</span>}
              <SourceTag tier={e.fig.tier} showLabel={false} />
            </>
          ) : (
            <span className="italic text-ink-faint">Not sourced</span>
          )}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metric card — native chart + tiny native⇄bars switcher + tap-to-inspect */
/* ------------------------------------------------------------------ */

function MetricCard({ def, tickers }) {
  const [open, setOpen] = useState(false) // explanation panel
  const [mode, setMode] = useState('native') // 'native' | 'bars'
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const parseable = withVal.filter((e) => parseScalar(e.fig.value) != null).length
  const lead = leaderIndex(def, entries)

  const native = nativeChartFor(def)
  const showSwitcher = native !== 'bars' && native !== 'chips'

  let body
  if (withVal.length === 0) {
    body = <p className="mt-xs text-caption italic text-ink-faint">No data for these companies — listed, not hidden.</p>
  } else if (def.visual === 'chips' || parseable === 0) {
    body = <ChipList entries={entries} lead={lead} />
  } else if (mode === 'bars') {
    body = <BarRows entries={entries} lead={lead} />
  } else if (native === 'donut') {
    body = <DonutChart entries={entries} lead={lead} />
  } else if (native === 'gauge') {
    body = <GaugeChart entries={entries} />
  } else if (native === 'diverge') {
    body = <DivergeChart entries={entries} />
  } else if (native === 'scale') {
    body = <ScaleChart entries={entries} lead={lead} />
  } else {
    body = <BarRows entries={entries} lead={lead} />
  }

  const missing = entries.filter((e) => !e.fig || e.fig.value == null).map((e) => e.ticker)

  return (
    <div className="border-b border-line/60 px-sm py-sm last:border-0">
      <div className="flex items-start justify-between gap-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-sm text-left"
        >
          <span className="text-label font-medium text-ink">{def.label}</span>
          <Chevron open={open} />
        </button>
        {showSwitcher && (
          <div className="flex shrink-0 overflow-hidden rounded-pill border border-line" role="group" aria-label={`${def.label} chart style`}>
            {[
              ['native', NATIVE_LABEL[native]],
              ['bars', 'Bars'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={
                  'px-xs py-2xs text-caption transition-colors ' +
                  (mode === id ? 'bg-surface-raised font-medium text-ink' : 'text-ink-faint hover:text-ink-soft')
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {body}
      <p className="mt-xs text-caption leading-snug text-ink-soft">{describeGap(def, figs)}</p>
      {missing.length > 0 && (
        <p className="mt-2xs text-caption italic text-ink-faint">Not sourced for: {missing.join(', ')}</p>
      )}
      {open && <ExplainPanel def={def} figs={figs} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pickers                                                               */
/* ------------------------------------------------------------------ */

function CompanyPicker({ selected, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-sm">
        <h2 className="text-heading font-medium text-ink">Companies</h2>
        <span className="text-caption text-ink-faint">
          {selected.length} of {MAX_COMPANIES} selected
        </span>
      </div>
      {GROUPS.map((g) => (
        <div key={g.label} className="mt-sm">
          <div className="text-eyebrow uppercase text-ink-faint">{g.label}</div>
          <div className="mt-xs flex flex-wrap gap-xs">
            {g.tickers.map((t) => {
              const isSel = selected.includes(t)
              const disableRemove = isSel && selected.length === 1
              const disableAdd = !isSel && selected.length >= MAX_COMPANIES
              const disabled = disableRemove || disableAdd
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(t)}
                  aria-pressed={isSel}
                  title={disableRemove ? 'Keep at least one company' : nameOf(t)}
                  className={
                    'inline-flex items-center gap-xs rounded-pill border px-sm py-2xs text-caption transition-all ' +
                    (isSel
                      ? 'border-transparent font-medium text-white'
                      : 'border-line bg-surface text-ink-soft hover:bg-surface-hover') +
                    (disabled && !isSel ? ' opacity-40' : '')
                  }
                  style={isSel ? { background: colorOf(t) } : undefined}
                >
                  <CompanyBadge name={t} size={16} />
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="mt-xs text-caption text-ink-faint">
        Pick 1–4 companies. Deselecting the last one is blocked so the stage never goes empty.
      </p>
    </div>
  )
}

function MetricPicker({ tickers, selectedIds, onToggle, onFamilyAll, onFamilyNone }) {
  // Only metrics with data for ≥1 selected company may appear.
  const available = useMemo(() => METRICS.filter((d) => coverage(d.id, tickers) > 0), [tickers])
  const byFamily = useMemo(() => {
    const map = Object.fromEntries(FAMILIES.map((f) => [f.id, []]))
    for (const def of available) {
      if (map[def.family]) map[def.family].push(def)
    }
    return map
  }, [available])
  return (
    <div className="mt-lg">
      <h2 className="text-heading font-medium text-ink">Metrics</h2>
      <p className="mt-2xs text-caption text-ink-faint">
        Only metrics with data for at least one selected company appear. Coverage counts
        update with your company selection.
      </p>
      <div className="mt-sm grid gap-sm">
        {FAMILIES.map((f) => {
          const defs = byFamily[f.id]
          if (defs.length === 0) return null
          return (
            <div key={f.id} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="flex items-center justify-between gap-sm px-sm py-xs">
                <span className="text-label font-medium text-ink">{f.label}</span>
                <span className="flex shrink-0 items-center gap-2xs">
                  <span className="mr-xs text-caption text-ink-faint">
                    {defs.filter((d) => selectedIds.includes(d.id)).length}/{defs.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFamilyAll(f.id)}
                    className="rounded-control px-xs py-2xs text-caption text-ink-soft transition-colors hover:bg-surface-hover"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => onFamilyNone(f.id)}
                    className="rounded-control px-xs py-2xs text-caption text-ink-soft transition-colors hover:bg-surface-hover"
                  >
                    None
                  </button>
                </span>
              </div>
              <div className="flex flex-wrap gap-xs border-t border-line/60 px-sm py-sm">
                {defs.map((d) => {
                  const cov = coverage(d.id, tickers)
                  const isSel = selectedIds.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onToggle(d.id)}
                      aria-pressed={isSel}
                      title={`${d.label} — data for ${cov} of ${tickers.length}`}
                      className={
                        'inline-flex items-center gap-xs rounded-pill border px-sm py-2xs text-caption transition-all ' +
                        (isSel
                          ? 'border-transparent font-medium text-white'
                          : 'border-line bg-surface-raised text-ink-soft hover:bg-surface-hover')
                      }
                      style={isSel ? { background: '#0E9AA7' } : undefined}
                    >
                      {d.label}
                      <span className={isSel ? 'opacity-80' : 'text-ink-faint'}>
                        {cov} of {tickers.length}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero takeaways                                                        */
/* ------------------------------------------------------------------ */

function Takeaways({ metricIds, tickers }) {
  const cards = useMemo(() => topTakeaways(metricIds, tickers), [metricIds, tickers])
  if (cards.length === 0) {
    return (
      <p className="mt-lg text-caption text-ink-faint">
        No wide gaps in the current selection — the biggest relative spreads show up here.
      </p>
    )
  }
  return (
    <ol className="mt-lg grid gap-sm md:grid-cols-3">
      {cards.map((c, i) => (
        <li
          key={i}
          className="rounded-card border border-line bg-surface p-md shadow-card"
        >
          <div className="text-data font-semibold tracking-tight text-ink">{c.figure}</div>
          <p className="mt-xs text-label text-ink-soft">{c.sub}</p>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------------ */

export default function CompareChartPerMetric() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricIds, setMetricIds] = useState(DEFAULT_METRICS)

  const selectedDefs = useMemo(
    () => METRICS.filter((d) => metricIds.includes(d.id) && coverage(d.id, tickers) > 0),
    [metricIds, tickers]
  )

  const toggleCompany = (t) => {
    setTickers((prev) => {
      if (prev.includes(t)) {
        if (prev.length === 1) return prev // blocked: keep ≥1
        return prev.filter((x) => x !== t)
      }
      if (prev.length >= MAX_COMPANIES) return prev
      return [...prev, t]
    })
  }
  const toggleMetric = (id) => {
    setMetricIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const familySet = (familyId, on) => {
    setMetricIds((prev) => {
      const ids = METRICS.filter((d) => d.family === familyId && coverage(d.id, tickers) > 0).map((d) => d.id)
      const kept = prev.filter((x) => !ids.includes(x))
      return on ? [...kept, ...ids] : kept
    })
  }

  return (
    <div>
      <CompanyPicker selected={tickers} onToggle={toggleCompany} />
      <MetricPicker
        tickers={tickers}
        selectedIds={metricIds}
        onToggle={toggleMetric}
        onFamilyAll={(f) => familySet(f, true)}
        onFamilyNone={(f) => familySet(f, false)}
      />

      {/* Live stage */}
      <div className="mt-xl border-t border-line pt-lg">
        <h2 className="text-heading font-medium text-ink">Live comparison</h2>
        <p className="mt-2xs text-caption text-ink-faint">
          Figures resolve live from the Atlas datasets — each metric renders in its
          native chart type. Flip any card to bars with the switcher in its header.
        </p>

        <Takeaways metricIds={metricIds} tickers={tickers} />

        {selectedDefs.length === 0 ? (
          <div className="mt-xl rounded-card border border-dashed border-line bg-surface p-md text-center">
            <p className="text-label text-ink">No metrics selected.</p>
            <p className="mt-2xs text-caption text-ink-faint">
              Pick metrics above — native charts build here instantly.
            </p>
          </div>
        ) : (
          <div className="mt-xl overflow-hidden rounded-card border border-line bg-surface shadow-card">
            {selectedDefs.map((def) => (
              <MetricCard key={def.id} def={def} tickers={tickers} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
