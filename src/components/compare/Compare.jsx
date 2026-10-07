import { useMemo, useState } from 'react'
import { revenue, getCompany } from '../../lib/data.js'
import { parseScalar } from '../../lib/compareVisual.js'
import {
  FAMILIES,
  METRICS,
  resolveFigure,
  availableMetrics,
  coverage,
  describeGap,
  topTakeaways,
} from '../../lib/compareMetrics.js'
import SectionHeader from '../common/SectionHeader.jsx'
import SourceTag from '../common/SourceTag.jsx'
import CompanyBadge from '../common/CompanyBadge.jsx'
import CompareIcon from '../common/icons/CompareIcon.jsx'

/*
  Section 08 — Company Comparison (interactive builder).
  The user picks 1–4 companies and any metrics; visuals build live from pure
  React state. Figures resolve ONLY through compareMetrics.resolveFigure —
  nothing is hardcoded, nothing re-gathered. Every visual is tap-to-inspect:
  the explanation panel carries what / why / good (registry) plus the
  generated "what this result means" (describeGap on the live selection).
  Profitability metrics diverge (centered, opposed) when exactly 2 companies
  are selected; otherwise everything groups. This section explains figures;
  it does not advise on securities.
*/

const GROUPS = [
  { label: 'Chip Design', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'MRVL', 'ARM'] },
  { label: 'Compute Providers', tickers: ['MSFT', 'AMZN', 'GOOGL', 'Meta', 'Oracle', 'CRWV'] },
]
const ALL_TICKERS = GROUPS.flatMap((g) => g.tickers)
const MAX_COMPANIES = 4
const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const DEFAULT_METRICS = ['revenue', 'gross-margin', 'op-margin', 'net-income', 'fcf']
const TEAL = '#0E9AA7'

function colorOf(ticker) {
  return getCompany(ticker)?.color ?? '#888888'
}
function nameOf(ticker) {
  return getCompany(ticker)?.name ?? ticker
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
/* Explain panel — the 4 layers                                         */
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
/* Visuals — bars, diverging bars, dot scale, chips, text fallback       */
/* ------------------------------------------------------------------ */

/** Index of the leader among parseable figures (null = no ▲ marking). */
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

function BarRows({ entries, lead }) {
  const scalars = entries.map((e) => parseScalar(e.fig?.value))
  const max = Math.max(...scalars.map((v) => Math.abs(v ?? 0)), 1e-9)
  return (
    <div className="mt-xs grid gap-2xs">
      {entries.map((e, i) => {
        const v = scalars[i]
        return (
          <div
            key={e.ticker}
            className="flex items-center gap-xs rounded-control px-2xs py-2xs transition-colors hover:bg-surface-hover"
          >
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

function DivergeBars({ entries, lead }) {
  const [a, b] = entries
  const va = parseScalar(a.fig.value)
  const vb = parseScalar(b.fig.value)
  const max = Math.max(Math.abs(va), Math.abs(vb), 1e-9)
  const half = (v) => `${Math.max(2, (Math.abs(v) / max) * 100)}%`
  const sides = [
    { e: a, v: va, align: 'right', corner: 'rounded-l-pill', justify: 'justify-end', i: 0 },
    { e: b, v: vb, align: 'left', corner: 'rounded-r-pill', justify: 'justify-start', i: 1 },
  ]
  return (
    <div className="mt-xs">
      <div className="flex items-center">
        {sides.map((s) => (
          <div key={s.e.ticker} className="contents">
            <span className={'w-24 shrink-0 px-2xs text-caption leading-tight text-ink ' + (s.align === 'right' ? 'text-right' : '')}>
              <span className="font-medium" style={{ color: colorOf(s.e.ticker) }}>
                {s.e.ticker}
              </span>{' '}
              {s.e.fig.value}
              {lead === s.i && (
                <span className="ml-2xs" aria-label="Highest value">
                  ▲
                </span>
              )}
            </span>
            {s.i === 0 && (
              <div className={'flex h-7 flex-1 items-center ' + s.justify}>
                <div className={'h-3.5 transition-all duration-500 ' + s.corner} style={{ width: half(s.v), background: colorOf(s.e.ticker) }} />
              </div>
            )}
            {s.i === 0 && <div className="w-px shrink-0 self-stretch bg-ink-faint/50" aria-hidden="true" />}
            {s.i === 1 && (
              <div className={'flex h-7 flex-1 items-center ' + s.justify}>
                <div className={'h-3.5 transition-all duration-500 ' + s.corner} style={{ width: half(s.v), background: colorOf(s.e.ticker) }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2xs flex items-center justify-between">
        <SourceTag tier={a.fig.tier} showLabel={false} />
        <SourceTag tier={b.fig.tier} showLabel={false} />
      </div>
    </div>
  )
}

function DotScale({ entries, lead }) {
  const scored = entries
    .map((e, i) => ({ e, i, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
  if (scored.length === 0) return null
  const max = Math.max(...scored.map((s) => Math.abs(s.v))) * 1.12 || 1
  return (
    <div className="mt-xs px-2xs">
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-surface-raised" />
        {scored.map((s, k) => (
          <div key={s.e.ticker} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${(Math.abs(s.v) / max) * 100}%` }}>
            <div
              className="h-3.5 w-3.5 -translate-x-1/2 rounded-full ring-2 ring-bg transition-transform hover:scale-125"
              style={{ background: colorOf(s.e.ticker) }}
              title={`${s.e.ticker} ${s.e.fig.value}`}
            />
            <div
              className={
                'absolute w-28 -translate-x-1/2 whitespace-normal text-center text-caption leading-tight text-ink ' +
                (k % 2 === 0 ? 'bottom-5' : 'top-5')
              }
            >
              <span className="font-medium" style={{ color: colorOf(s.e.ticker) }}>
                {s.e.ticker}
              </span>{' '}
              {s.e.fig.value.split(' ')[0]}
              {lead === s.i && (
                <span className="ml-2xs" aria-label="Highest value">
                  ▲
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2xs flex items-center justify-between text-caption text-ink-faint">
        <span>0</span>
        <span className="flex items-center gap-xs">
          {scored.map((s) => (
            <SourceTag key={s.e.ticker} tier={s.e.fig.tier} showLabel={false} />
          ))}
        </span>
      </div>
    </div>
  )
}

function ChipList({ entries, lead }) {
  return (
    <div className="mt-xs flex flex-wrap gap-xs">
      {entries.map((e, i) => (
        <span
          key={e.ticker}
          className="inline-flex items-center gap-xs rounded-pill border border-line bg-surface-raised px-sm py-2xs text-caption text-ink transition-colors hover:bg-surface-hover"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: colorOf(e.ticker) }} />
          <span className="font-medium">{e.ticker}</span>
          {e.fig ? (
            <>
              {e.fig.value}
              {lead === i && (
                <span aria-label="Highest value">
                  ▲
                </span>
              )}
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
/* Metric card — one card per selected metric                            */
/* ------------------------------------------------------------------ */

function MetricCard({ def, tickers }) {
  const [open, setOpen] = useState(false)
  const figs = useMemo(() => tickers.map((t) => resolveFigure(def.id, t)), [def.id, tickers])
  const entries = tickers.map((ticker, i) => ({ ticker, fig: figs[i] }))
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const lead = leaderIndex(def, entries)
  const parseable = withVal.filter((e) => parseScalar(e.fig.value) != null).length

  let visual
  if (withVal.length === 0) {
    visual = (
      <p className="mt-xs text-caption italic text-ink-faint">
        No data for these companies — listed, not hidden.
      </p>
    )
  } else if (def.visual === 'chips' || parseable === 0) {
    visual = <ChipList entries={entries} lead={lead} />
  } else if (def.visual === 'scale') {
    visual = <DotScale entries={entries} lead={lead} />
  } else if (def.family === 'profitability' && tickers.length === 2 && withVal.length === 2 && parseable === 2) {
    visual = <DivergeBars entries={entries} lead={lead} />
  } else {
    visual = <BarRows entries={entries} lead={lead} />
  }

  const missing = entries.filter((e) => !e.fig || e.fig.value == null).map((e) => e.ticker)

  return (
    <div className="border-b border-line/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full px-sm py-sm text-left transition-colors hover:bg-surface-hover"
      >
        <span className="flex items-center justify-between gap-sm">
          <span className="text-label font-medium text-ink">{def.label}</span>
          <Chevron open={open} />
        </span>
        {visual}
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
/* Company picker                                                        */
/* ------------------------------------------------------------------ */

function CompanyPicker({ selected, onToggle }) {
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()
  return (
    <div>
      <div className="flex items-center justify-between gap-sm">
        <h2 className="text-heading font-medium text-ink">Companies</h2>
        <span className="text-caption text-ink-faint">
          {selected.length} of {MAX_COMPANIES} selected
        </span>
      </div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter companies…"
        aria-label="Filter companies"
        className="mt-xs w-full rounded-control border border-line bg-surface px-sm py-xs text-label text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2"
        style={{ '--tw-ring-color': TEAL }}
      />
      {GROUPS.map((g) => {
        const shown = g.tickers.filter(
          (t) => !q || t.toLowerCase().includes(q) || nameOf(t).toLowerCase().includes(q)
        )
        if (shown.length === 0) return null
        return (
          <div key={g.label} className="mt-sm">
            <div className="text-eyebrow uppercase text-ink-faint">{g.label}</div>
            <div className="mt-xs flex flex-wrap gap-xs">
              {shown.map((t) => {
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
        )
      })}
      <p className="mt-xs text-caption text-ink-faint">
        Pick 1–4 companies. Deselecting the last one is blocked so the stage never goes empty.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metric picker                                                         */
/* ------------------------------------------------------------------ */

function MetricPicker({ available, tickers, selectedIds, onToggle, onFamilyAll, onFamilyNone }) {
  const [openFamilies, setOpenFamilies] = useState(() =>
    Object.fromEntries(FAMILIES.map((f) => [f.id, true]))
  )
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
        Only metrics with data for at least one Atlas company appear. Coverage counts
        update with your company selection.
      </p>
      <div className="mt-sm grid gap-sm">
        {FAMILIES.map((f) => {
          const defs = byFamily[f.id]
          if (defs.length === 0) return null
          const open = openFamilies[f.id]
          return (
            <div key={f.id} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="flex items-center justify-between gap-sm px-sm py-xs">
                <button
                  type="button"
                  onClick={() => setOpenFamilies((o) => ({ ...o, [f.id]: !o[f.id] }))}
                  aria-expanded={open}
                  className="flex flex-1 items-center gap-sm text-left"
                >
                  <span className="text-label font-medium text-ink">{f.label}</span>
                  <span className="text-caption text-ink-faint">
                    {defs.filter((d) => selectedIds.includes(d.id)).length}/{defs.length}
                  </span>
                  <Chevron open={open} />
                </button>
                <span className="flex shrink-0 gap-2xs">
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
              {open && (
                <div className="flex flex-wrap gap-xs border-t border-line/60 px-sm py-sm">
                  {defs.map((d) => {
                    const cov = coverage(d.id, tickers)
                    const isSel = selectedIds.includes(d.id)
                    const hasData = cov > 0
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!hasData}
                        onClick={() => onToggle(d.id)}
                        aria-pressed={isSel}
                        title={hasData ? `${d.label} — data for ${cov} of ${tickers.length}` : 'No data for these companies'}
                        className={
                          'inline-flex items-center gap-xs rounded-pill border px-sm py-2xs text-caption transition-all ' +
                          (isSel
                            ? 'border-transparent font-medium text-white'
                            : hasData
                              ? 'border-line bg-surface-raised text-ink-soft hover:bg-surface-hover'
                              : 'cursor-not-allowed border-line/60 bg-surface text-ink-faint line-through opacity-60')
                        }
                        style={isSel ? { background: TEAL } : undefined}
                      >
                        {d.label}
                        <span className={isSel ? 'opacity-80' : 'text-ink-faint'}>
                          {cov} of {tickers.length}
                        </span>
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
          className="rounded-card border border-line bg-surface p-md shadow-card transition-colors hover:bg-surface-hover"
        >
          <div className="text-data font-semibold tracking-tight text-ink">{c.figure}</div>
          <p className="mt-xs text-label text-ink-soft">{c.sub}</p>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* Revenue trend — generalized to any selected set                       */
/* ------------------------------------------------------------------ */

function RevenueTrend({ tickers }) {
  const q = revenue.quarters
  const byTicker = useMemo(
    () => Object.fromEntries(revenue.series.map((s) => [s.ticker, s.revenue])),
    []
  )
  const lines = tickers
    .map((t) => ({ ticker: t, vals: byTicker[t], color: colorOf(t) }))
    .filter((l) => l.vals && l.vals.length > 0)
  if (lines.length === 0) return null

  const W = 640
  const H = 190
  const L = 44
  const R = 10
  const T = 14
  const B = 24
  const n = Math.min(...lines.map((l) => l.vals.length), q.length)
  const YMAX = Math.max(...lines.flatMap((l) => l.vals.slice(0, n))) * 1.08 || 1
  const X = (i) => L + (i / Math.max(n - 1, 1)) * (W - L - R)
  const Y = (v) => T + (1 - v / YMAX) * (H - T - B)
  const path = (vals) =>
    vals
      .slice(0, n)
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
      .join(' ')
  const gridMax = YMAX / 1.08
  const step = gridMax > 200 ? 100 : gridMax > 50 ? 50 : 10

  return (
    <figure className="mt-xl rounded-card border border-line bg-surface p-md shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-xs">
        <figcaption className="text-heading font-medium text-ink">
          Quarterly revenue — last {n} quarters
        </figcaption>
        <div className="flex flex-wrap items-center gap-md text-caption text-ink-soft">
          {lines.map((l) => (
            <span key={l.ticker} className="flex items-center gap-2xs">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.ticker}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-sm w-full"
        role="img"
        aria-label={`Quarterly revenue trend: ${lines.map((l) => `${l.ticker} ends at $${l.vals[n - 1]}B`).join(', ')}`}
      >
        {Array.from({ length: Math.floor(gridMax / step) + 1 }, (_, k) => k * step).map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={Y(g)} y2={Y(g)} className="stroke-line" strokeWidth="1" opacity="0.7" />
            <text x={L - 6} y={Y(g) + 4} textAnchor="end" className="fill-ink-faint" fontSize="11">
              ${g}B
            </text>
          </g>
        ))}
        {[0, Math.floor(n / 2), n - 1].map((i) => (
          <text
            key={i}
            x={i === n - 1 ? W - R : X(i)}
            y={H - 6}
            textAnchor={i === n - 1 ? 'end' : 'middle'}
            className="fill-ink-faint"
            fontSize="11"
          >
            {q[i]}
          </text>
        ))}
        {lines.map((l, li) => {
          const last = l.vals[n - 1]
          return (
            <g key={l.ticker}>
              <path d={path(l.vals)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx={X(n - 1)} cy={Y(last)} r="4" fill={l.color} stroke="var(--bg)" strokeWidth="1.5" />
              <text
                x={X(n - 1) - 8}
                y={Y(last) + (li % 2 === 0 ? -8 : 16)}
                textAnchor="end"
                fontSize="12"
                fontWeight="600"
                fill={l.color}
              >
                ${last}B
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-xs text-caption text-ink-faint">
        Reported quarterly revenue, US$ billions · Fiscal and calendar quarters are not
        strictly aligned across companies.
      </p>
    </figure>
  )
}

/* ------------------------------------------------------------------ */

export default function Compare({ section }) {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricIds, setMetricIds] = useState(DEFAULT_METRICS)

  const available = useMemo(() => availableMetrics(ALL_TICKERS), [])
  const availableIds = useMemo(() => new Set(available.map((d) => d.id)), [available])
  const selectedDefs = useMemo(
    () => METRICS.filter((d) => availableIds.has(d.id) && metricIds.includes(d.id)),
    [availableIds, metricIds]
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
      const ids = METRICS.filter((d) => d.family === familyId && availableIds.has(d.id)).map((d) => d.id)
      const kept = prev.filter((x) => !ids.includes(x))
      return on ? [...kept, ...ids] : kept
    })
  }

  return (
    <section>
      <SectionHeader section={section} accent={section.color} icon={CompareIcon}>
        <p className="mt-sm text-caption text-ink-faint">
          Figures resolve live from the Atlas datasets — nothing here is hardcoded.
        </p>
      </SectionHeader>

      {/* Sticky company header — stays visible while scrolling */}
      <div className="sticky top-0 z-10 -mx-sm border-b border-line bg-bg/95 px-sm py-xs backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-md">
          {tickers.map((t) => (
            <span key={t} className="flex items-center gap-xs">
              <CompanyBadge name={t} size={20} />
              <span className="text-label font-medium" style={{ color: colorOf(t) }}>
                {nameOf(t)}
              </span>
            </span>
          ))}
        </div>
      </div>

      <CompanyPicker selected={tickers} onToggle={toggleCompany} />
      <MetricPicker
        available={available}
        tickers={tickers}
        selectedIds={metricIds}
        onToggle={toggleMetric}
        onFamilyAll={(f) => familySet(f, true)}
        onFamilyNone={(f) => familySet(f, false)}
      />

      {/* Live stage */}
      <div className="mt-xl border-t border-line pt-lg">
        <h2 className="text-heading font-medium text-ink">Live comparison</h2>

        <Takeaways metricIds={metricIds} tickers={tickers} />
        <RevenueTrend tickers={tickers} />

        {selectedDefs.length === 0 ? (
          <div className="mt-xl rounded-card border border-dashed border-line bg-surface p-md text-center">
            <p className="text-label text-ink">No metrics selected.</p>
            <p className="mt-2xs text-caption text-ink-faint">
              Pick metrics above — bars, scales, and explanations build here instantly.
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
    </section>
  )
}
