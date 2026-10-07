import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FAMILIES,
  METRICS,
  coverage,
  resolveFigure,
  availableMetrics,
  describeGap,
} from '../../lib/compareMetrics.js'
import { parseScalar, sparkPath } from '../../lib/compareVisual.js'
import { getCompany, revenue as quarterlyRevenue } from '../../lib/data.js'
import { effectiveTheme, setTheme } from '../../lib/theme.js'
import CompanyBadge from '../../components/common/CompanyBadge.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'

/*
  Lab variant — "Focus" for the Company Comparison builder.

  Radically calm: one metric at a time (or four in quad mode), rendered huge
  in the design element native to its family, with almost no chrome. A
  collapsible left menu (slides to a 48px icon rail; overlay drawer on
  mobile) holds companies + the metric list.

  Selection contract (the bug hunt, 2026-10-07): every selected company
  ALWAYS renders in every visual. Companies without data for the current
  metric are shown explicitly as "Not sourced" — never silently dropped.
  A coverage note ("3 of 4 with data") makes partial coverage transparent.

  Interaction: hovering a company's slice/bar/gauge dims the rest and shows
  a tooltip (exact value + share); clicking isolates it (click again, empty
  space, or the reset pill to restore). Keyboard: Tab + Enter isolates.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. The stage is never empty: the last company cannot
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
const QUAD_DEFAULTS = ['revenue', 'pe-trailing', 'market-cap', 'gross-margin']

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
/* Focal interaction — hover highlight, click-to-isolate, tooltip.     */
/* One instance per focal point, so quadrants stay independent.         */
/* ------------------------------------------------------------------ */

function useFocalInteraction() {
  const [hovered, setHovered] = useState(null)
  const [isolated, setIsolated] = useState(null)
  const [tip, setTip] = useState(null)
  const rootRef = useRef(null)

  const opacityFor = (ticker) => {
    if (isolated) return ticker === isolated ? 1 : 0.12
    if (hovered && ticker !== hovered) return 0.35
    return 1
  }
  const toggleIsolate = (ticker) => setIsolated((p) => (p === ticker ? null : ticker))
  const clearIsolate = () => setIsolated(null)

  const placeTip = (e) => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    setTip((t) => (t ? { ...t, x, y, flip: x > r.width * 0.62 } : t))
  }
  const showTip = (e, ticker, lines) => {
    const r = rootRef.current?.getBoundingClientRect()
    const x = r ? e.clientX - r.left : 0
    const y = r ? e.clientY - r.top : 0
    setHovered(ticker)
    setTip({ x, y, flip: r ? x > r.width * 0.62 : false, ticker, lines })
  }
  const hideTip = () => {
    setTip(null)
    setHovered(null)
  }

  /** Props to spread onto any interactive segment (SVG or HTML). */
  const segmentProps = (ticker, tipLines, label) => ({
    onMouseEnter: (e) => showTip(e, ticker, tipLines),
    onMouseMove: placeTip,
    onMouseLeave: hideTip,
    onClick: (e) => {
      e.stopPropagation()
      toggleIsolate(ticker)
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        toggleIsolate(ticker)
      }
    },
    onFocus: () => setHovered(ticker),
    onBlur: () => setHovered(null),
    tabIndex: 0,
    role: 'button',
    'aria-pressed': isolated === ticker,
    'aria-label': label ?? `${nameOf(ticker)} — activate to isolate`,
    style: { opacity: opacityFor(ticker), transition: 'opacity 200ms ease', cursor: 'pointer', outline: 'none' },
  })

  return {
    hovered,
    isolated,
    tip,
    rootRef,
    opacityFor,
    toggleIsolate,
    clearIsolate,
    showTip,
    hideTip,
    segmentProps,
  }
}

function ChartTip({ tip }) {
  if (!tip) return null
  return (
    <div
      className="pointer-events-none absolute z-30 w-max max-w-60 rounded-control border border-line bg-surface px-sm py-xs shadow-card"
      style={{
        left: tip.flip ? undefined : tip.x + 14,
        right: tip.flip ? 8 : undefined,
        top: Math.max(8, tip.y - 12),
      }}
    >
      {tip.lines.map((ln, i) => (
        <div
          key={i}
          style={i === 0 ? { color: colorOf(tip.ticker) } : undefined}
          className={i === 0 ? 'font-medium text-label' : 'text-caption text-ink-soft'}
        >
          {ln}
        </div>
      ))}
    </div>
  )
}

function IsolateReset({ isolated, onClear }) {
  if (!isolated) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClear()
      }}
      aria-label="Show all companies"
      className="absolute right-sm top-sm z-20 flex items-center gap-2xs rounded-pill border border-line bg-surface px-sm py-2xs text-caption text-ink-soft shadow-card transition-colors hover:text-ink"
    >
      <span className="h-2 w-2 rounded-full" style={{ background: colorOf(isolated) }} />
      {isolated} only
      <span aria-hidden="true">✕</span>
    </button>
  )
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

function InfoModal({ def, figs, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
      role="dialog"
      aria-modal="true"
      aria-label={`About ${def.label}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card bg-surface p-md shadow-card sm:p-lg">
        <div className="mb-sm flex items-start justify-between gap-sm">
          <h3 className="text-heading font-medium text-ink">{def.label}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-control p-2xs text-ink-soft hover:bg-surface-hover"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <ExplainPanel def={def} figs={figs} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Big donut — Size & scale metrics. Share across selected companies.   */
/* Every selected company appears in the legend; missing data is        */
/* marked "Not sourced", never silently dropped.                       */
/* ------------------------------------------------------------------ */

function BigDonut({ entries, lead, ix, compact }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null && s.v > 0)
  const total = scored.reduce((a, s) => a + s.v, 0)
  const R = 46
  const C = 2 * Math.PI * R
  let acc = 0
  const leader =
    lead >= 0 ? entries[lead] : scored.length > 0 ? scored.reduce((a, b) => (b.v > a.v ? b : a)).e : null
  const size = compact ? 'h-44 w-44' : 'h-72 w-72 sm:h-96 sm:w-96'
  // In compact (4-up) quadrants the legend stacks below the donut in two
  // columns — side-by-side at that width clipped the legend (2026-10-07).
  const rowText = compact ? 'text-caption' : 'text-body'
  return (
    <div
      ref={ix.rootRef}
      className={
        'relative flex w-full flex-col items-center ' +
        (compact ? 'gap-md' : 'gap-lg sm:flex-row sm:gap-xl')
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      <div className={`relative ${size} shrink-0`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Relative share donut">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="16" className="stroke-line" opacity="0.3" />
          {scored.map((s) => {
            const frac = total > 0 ? s.v / total : 0
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
                {...ix.segmentProps(s.e.ticker, [
                  nameOf(s.e.ticker),
                  s.e.fig.value,
                  `${((s.v / total) * 100).toFixed(1)}% of selected companies`,
                ])}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="font-semibold leading-tight text-ink text-title">
            {leader?.fig?.value?.split(' ')[0] ?? '—'}
          </span>
          <span className="leading-tight text-ink-faint text-label">
            {leader ? `${leader.ticker} leads` : 'No values'}
          </span>
        </div>
      </div>
      <ul className={'grid w-full min-w-0 ' + (compact ? 'grid-cols-2 gap-xs' : 'max-w-sm gap-sm')}>
        {entries.map((e) => {
          const v = parseScalar(e.fig?.value)
          const ok = v != null && v > 0
          const share = ok && total > 0 ? `${((v / total) * 100).toFixed(1)}%` : null
          return (
            <li
              key={e.ticker}
              {...(ok
                ? ix.segmentProps(e.ticker, [
                    nameOf(e.ticker),
                    e.fig.value,
                    `${share} of selected companies`,
                  ])
                : {})}
              className={'flex items-center gap-sm ' + rowText + (ok ? '' : ' opacity-60')}
            >
              <CompanyBadge name={e.ticker} size={26} />
              <span className="truncate font-medium" style={{ color: colorOf(e.ticker) }}>
                {compact ? e.ticker : nameOf(e.ticker)}
              </span>
              <span className="truncate text-ink-soft">{e.fig ? e.fig.value : 'Not sourced'}</span>
              {share && <span className="ml-auto shrink-0 font-medium text-ink">{share}</span>}
            </li>
          )
        })}
      </ul>
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Big radial gauges — margins & returns, one per company.              */
/* ------------------------------------------------------------------ */

function BigGauges({ entries, ix, compact }) {
  return (
    <div
      ref={ix.rootRef}
      className="relative grid w-full grid-cols-2 gap-md sm:gap-lg"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      {entries.map((e) => {
        const v = parseScalar(e.fig?.value)
        const has = e.fig && v != null
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
            {...(has ? ix.segmentProps(e.ticker, [nameOf(e.ticker), e.fig.value]) : {})}
            className={
              'flex flex-col items-center rounded-card bg-surface-raised px-sm ' +
              (compact ? 'py-sm' : 'py-md') +
              (has ? '' : ' opacity-60')
            }
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
                {has ? (
                  e.fig.value.split(' ')[0]
                ) : (
                  <span className="italic text-ink-faint">Not sourced</span>
                )}
              </div>
              {has && <SourceTag tier={e.fig.tier} showLabel={false} />}
            </div>
          </div>
        )
      })}
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Big bars — the fallback and growth visual. One row per company.      */
/* ------------------------------------------------------------------ */

function BigBars({ entries, lead, ix, compact, note }) {
  const scalars = entries.map((e) => parseScalar(e.fig?.value))
  const max = Math.max(...scalars.map((v) => Math.abs(v ?? 0)), 1e-9)
  return (
    <div
      ref={ix.rootRef}
      className="relative grid w-full gap-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      {note && <p className="text-center text-caption text-ink-faint">{note}</p>}
      {entries.map((e, i) => {
        const v = scalars[i]
        const has = e.fig && v != null
        return (
          <div
            key={e.ticker}
            {...(has ? ix.segmentProps(e.ticker, [nameOf(e.ticker), e.fig.value]) : {})}
            className={'flex items-center gap-sm ' + (has ? '' : 'opacity-60')}
          >
            <span className="flex w-36 shrink-0 items-center gap-xs">
              <CompanyBadge name={e.ticker} size={24} />
              <span className="truncate font-medium text-body" style={{ color: colorOf(e.ticker) }}>
                {nameOf(e.ticker)}
              </span>
            </span>
            {has ? (
              <>
                <div
                  className={
                    'min-w-6 flex-1 overflow-hidden rounded-pill bg-surface-raised ' +
                    (compact ? 'h-5' : 'h-6')
                  }
                >
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
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dot-on-scale — valuation multiples. Dots on a shared axis.           */
/* Companies without a value get an explicit "Not sourced" row.        */
/* ------------------------------------------------------------------ */

function DotScale({ entries, ix, compact }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
    .sort((a, b) => a.v - b.v)
  const missing = entries.filter((e) => parseScalar(e.fig?.value) == null)
  if (scored.length < 2) {
    return (
      <BigBars
        entries={entries}
        lead={-1}
        ix={ix}
        compact={compact}
        note="Fewer than two values for a scale — showing bars instead."
      />
    )
  }
  const vals = scored.map((s) => s.v)
  const lo0 = vals[0]
  const hi0 = vals[vals.length - 1]
  const pad = (hi0 - lo0) * 0.18 || 1
  const lo = lo0 - pad
  const hi = hi0 + pad
  const pos = (v) => ((v - lo) / (hi - lo)) * 100

  // Collision-aware dot lanes: dots within ~9% of the scale width of each
  // other stagger above/below the axis with leader lines, so numbered dots
  // never overlap at any dot count (2–4) or quadrant size.
  const dots = scored.map((s, i) => ({ ...s, n: i + 1, left: pos(s.v), lane: 0 }))
  const lanes = []
  dots.forEach((d) => {
    let lane = 0
    while (lanes[lane]?.some((o) => Math.abs(o.left - d.left) < 9)) lane += 1
    d.lane = lane
    ;(lanes[lane] ??= []).push(d)
  })
  const laneDy = [0, -30, 30, -58] // px offset from the axis per lane

  return (
    <div
      ref={ix.rootRef}
      className="relative w-full px-sm py-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      {/* the scale — numbered dots only; values live in the legend below */}
      <div className="relative h-28">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-surface-raised" />
        {dots.map((d) => {
          const dy = laneDy[Math.min(d.lane, laneDy.length - 1)]
          const seg = ix.segmentProps(d.e.ticker, [nameOf(d.e.ticker), d.e.fig.value])
          return (
            <div
              key={d.e.ticker}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${d.left}%`, top: `calc(50% + ${dy}px)` }}
            >
              {dy !== 0 && (
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 w-px -translate-x-1/2 bg-line-strong"
                  style={
                    dy < 0
                      ? { top: '15px', height: `${-dy - 15}px` }
                      : { bottom: '15px', height: `${dy - 15}px` }
                  }
                />
              )}
              <div
                {...seg}
                title={`${nameOf(d.e.ticker)} — ${d.e.fig.value}`}
                style={{ ...seg.style, background: colorOf(d.e.ticker) }}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-caption font-semibold text-white shadow-sm"
              >
                {d.n}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2xs flex justify-between text-caption text-ink-faint">
        <span>{`Lower ← ${lo0}`}</span>
        <span>{`→ Higher ${hi0}`}</span>
      </div>
      {/* tidy numbered legend — one row per dot, can never overlap */}
      <ul className="mt-sm grid gap-xs">
        {dots.map((d) => (
          <li
            key={d.e.ticker}
            {...ix.segmentProps(d.e.ticker, [nameOf(d.e.ticker), d.e.fig.value])}
            className="flex items-center gap-sm text-body"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold text-white"
              style={{ background: colorOf(d.e.ticker) }}
            >
              {d.n}
            </span>
            <CompanyBadge name={d.e.ticker} size={20} />
            <span className="truncate font-medium" style={{ color: colorOf(d.e.ticker) }}>
              {nameOf(d.e.ticker)}
            </span>
            <span className="ml-auto shrink-0 font-semibold text-ink">{d.e.fig.value}</span>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <p className="mt-sm text-center text-caption text-ink-faint">
          Not sourced:{' '}
          {missing.map((e) => (
            <span key={e.ticker} className="font-medium" style={{ color: colorOf(e.ticker) }}>
              {' '}
              {e.ticker}
            </span>
          ))}
        </p>
      )}
      <p className="mt-sm text-center text-caption text-ink-faint">
        Multiples are not ranked — a higher or lower value is not inherently better.
      </p>
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cash flow — revenue → operating cash flow → capex → free cash flow,  */
/* per company. Capex is an outflow (red). Whole card is interactive.   */
/* ------------------------------------------------------------------ */

const FLOW_STEPS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'ocf', label: 'Operating cash flow' },
  { id: 'capex', label: 'Capex (outflow)' },
  { id: 'fcf', label: 'Free cash flow' },
]

function CashFlow({ tickers, ix, compact }) {
  const rows = tickers.map((ticker) => ({
    ticker,
    figs: FLOW_STEPS.map((s) => resolveFigure(s.id, ticker)),
  }))
  const allVals = rows.flatMap((r) => r.figs.map((f) => Math.abs(parseScalar(f?.value) ?? 0)))
  const max = Math.max(...allVals, 1e-9)
  const stepW = compact ? 'w-28' : 'w-40'
  const valW = compact ? 'w-20' : 'w-28'
  return (
    <div
      ref={ix.rootRef}
      className={'relative grid w-full ' + (compact ? 'gap-md' : 'gap-lg')}
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      {rows.map(({ ticker, figs }) => {
        const fcf = figs[3]
        const interactive = fcf && parseScalar(fcf.value) != null
        return (
          <div
            key={ticker}
            {...(interactive
              ? ix.segmentProps(ticker, [nameOf(ticker), `Free cash flow ${fcf.value}`])
              : {})}
            className={'rounded-card bg-surface-raised ' + (compact ? 'p-sm' : 'p-md') + (interactive ? '' : ' opacity-70')}
          >
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
                    <span className={stepW + ' shrink-0 truncate text-caption text-ink-soft'}>{step.label}</span>
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
                        <span className={valW + ' shrink-0 text-right text-body text-ink'}>{fig.value}</span>
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
        )
      })}
      <p className="text-center text-caption text-ink-faint">
        Free cash flow = operating cash flow − capex.
      </p>
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 18-quarter revenue trend — the growth story. Companies without a      */
/* quarterly series are listed, not hidden.                            */
/* ------------------------------------------------------------------ */

function TrendChart({ tickers, ix }) {
  const quarters = quarterlyRevenue.quarters ?? []
  // A series is usable only with ≥2 reported (non-null) quarters. Tickers
  // whose series is missing or all-null are listed, never plotted, and —
  // critically — never passed to .toFixed() (the 2026-10-07 crash).
  const usable = (s) => s && s.revenue.filter((v) => v != null).length >= 2
  const series = useMemo(
    () =>
      tickers
        .map((t) => quarterlyRevenue.series.find((s) => s.ticker === t))
        .filter((s) => usable(s)),
    [tickers],
  )
  const missingTickers = tickers.filter(
    (t) => !series.some((s) => s.ticker === t),
  )
  const lastVal = (s) => {
    const vals = s.revenue.filter((v) => v != null)
    return vals.length ? vals[vals.length - 1] : null
  }
  if (series.length === 0) return null
  const W = 800
  const H = 300
  const labelIdx = [0, 5, 11, quarters.length - 1].filter((i) => i < quarters.length)
  const allVals = series.flatMap((s) => s.revenue.filter((v) => v != null))
  const maxV = Math.max(...allVals, 1)
  return (
    <div
      ref={ix.rootRef}
      className="relative w-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
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
        {series.map((s) => {
          const d = sparkPath(
            s.revenue.map((v) => v ?? 0),
            W - 70,
            H - 40,
          )
          const last = lastVal(s)
          const seg = ix.segmentProps(s.ticker, [
            nameOf(s.ticker),
            last != null ? `$${last.toFixed(2)}B latest reported quarter` : 'No reported quarters',
          ])
          return (
            <g key={s.ticker} transform="translate(60,20)">
              {/* wide invisible hit path for easy hovering */}
              <path d={d} fill="none" stroke="transparent" strokeWidth="18" style={{ pointerEvents: 'stroke' }} {...seg} />
              <path
                d={d}
                fill="none"
                stroke={colorOf(s.ticker)}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ opacity: ix.opacityFor(s.ticker), transition: 'opacity 200ms ease', pointerEvents: 'none' }}
              />
            </g>
          )
        })}
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
        {series.map((s) => {
          const last = lastVal(s)
          return (
            <span
              key={s.ticker}
              {...ix.segmentProps(s.ticker, [
                nameOf(s.ticker),
                last != null ? `$${last.toFixed(2)}B latest reported quarter` : 'No reported quarters',
              ])}
              className="flex items-center gap-2xs text-body"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s.ticker) }} />
              <span className="font-medium" style={{ color: colorOf(s.ticker) }}>
                {s.ticker}
              </span>
              <span className="text-ink-soft">
                {last != null ? `$${last.toFixed(2)}B` : 'no data'}
              </span>
            </span>
          )
        })}
        {missingTickers.map((t) => (
          <span key={t} className="flex items-center gap-2xs text-body opacity-60">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(t) }} />
            <span className="font-medium" style={{ color: colorOf(t) }}>
              {t}
            </span>
            <span className="italic text-caption text-ink-faint">no quarterly series</span>
          </span>
        ))}
      </div>
      <p className="mt-sm text-center text-caption text-ink-faint">
        Reported quarterly revenue, US$ billions · Fiscal and calendar quarters are not strictly aligned across
        companies.
      </p>
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* One place that picks the native visual for a metric. */
function FocusVisual({ def, tickers, ix, compact }) {
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

  let visual
  if (def.family === 'size') {
    visual = <BigDonut entries={entries} lead={lead} ix={ix} compact={compact} />
  } else if (def.family === 'profitability' || def.family === 'returns') {
    visual = <BigGauges entries={entries} ix={ix} compact={compact} />
  } else if (def.family === 'growth' && def.id === 'rev-cagr-5y') {
    const hasAny = tickers.some((t) => quarterlyRevenue.series.some((s) => s.ticker === t))
    visual = hasAny ? (
      <TrendChart tickers={tickers} ix={ix} />
    ) : (
      <BigBars entries={entries} lead={lead} ix={ix} compact={compact} />
    )
  } else if (def.family === 'cash' && (def.id === 'ocf' || def.id === 'fcf')) {
    visual = <CashFlow tickers={tickers} ix={ix} compact={compact} />
  } else if (def.family === 'valuation' && def.higherIsBetter == null) {
    visual = <DotScale entries={entries} ix={ix} compact={compact} />
  } else {
    visual = <BigBars entries={entries} lead={lead} ix={ix} compact={compact} />
  }

  const missingCount = entries.length - withVal.length
  return (
    <div>
      <div key={def.id + tickers.join(',')}>{visual}</div>
      {missingCount > 0 && (
        <p className="mt-sm text-center text-caption text-ink-faint">
          {withVal.length} of {entries.length} selected companies have data for this metric — the rest are
          marked, not hidden.
        </p>
      )}
    </div>
  )
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
/* MetricPicker — compact dropdown per focal point. Tap the metric name  */
/* → grouped list (by family, with live coverage counts) → one tap      */
/* jumps to any metric. Closes on outside click / Escape.               */
/* ------------------------------------------------------------------ */

function MetricPicker({ tickers, currentId, onPick, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Choose a metric"
      className="absolute right-0 top-full z-40 mt-xs max-h-80 w-72 overflow-y-auto rounded-card border border-line bg-surface p-xs shadow-card"
    >
      {FAMILIES.map((f) => {
        const ms = avail.filter((m) => m.family === f.id)
        if (ms.length === 0) return null
        return (
          <div key={f.id}>
            <div className="px-sm py-2xs text-eyebrow uppercase text-ink-faint">{f.label}</div>
            {ms.map((m) => {
              const c = coverage(m.id, tickers)
              const active = m.id === currentId
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onPick(m.id)
                    onClose()
                  }}
                  className={
                    'flex w-full items-center justify-between gap-sm rounded-control px-sm py-xs text-left text-label transition-colors ' +
                    (active
                      ? 'bg-accent/15 font-medium text-ink'
                      : 'text-ink-soft hover:bg-surface-hover hover:text-ink')
                  }
                >
                  <span className="truncate">{m.label}</span>
                  <span className="shrink-0 text-caption text-ink-faint">
                    {c}/{tickers.length}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="4" />
      <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M16 4l-1.4 1.4M5.4 14.6L4 16" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 13.5A7.5 7.5 0 0 1 6.5 3.5a7.5 7.5 0 1 0 10 10z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* FocalPoint — one independent focal area: its own metric navigator,  */
/* its own visual, its own info modal and interaction state. Company   */
/* selection is shared across all focal points.                        */
/* ------------------------------------------------------------------ */

function FocalPoint({ tickers, metricId, onMetricId, onToggleTicker, compact }) {
  const ix = useFocalInteraction()
  const [infoOpen, setInfoOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const def = avail.find((m) => m.id === metricId) ?? avail[0]
  const figs = useMemo(
    () => (def ? tickers.map((t) => resolveFigure(def.id, t)) : []),
    [def, tickers],
  )

  if (!def) return null
  const idx = avail.findIndex((m) => m.id === def.id)
  const go = (dir) => {
    if (avail.length === 0) return
    onMetricId(avail[(idx + dir + avail.length) % avail.length].id)
  }

  return (
    <section
      aria-label={`Focal point: ${def.label}`}
      className={
        'flex min-w-0 flex-col rounded-card border border-line/60 bg-surface ' +
        (compact ? 'h-full min-h-0' : '')
      }
    >
      {/* per-quadrant navigator */}
      <div className="flex items-center gap-xs border-b border-line/60 px-sm py-xs">
        {/* company chips: hidden in compact (4-up) quadrants — selection lives
            in the side menu and the top bar; this keeps headers compact and
            kills the mid-chip clipping seen in narrow quadrants (2026-10-07) */}
        {!compact && (
          <div className="flex min-w-0 flex-1 items-center gap-2xs overflow-x-auto">
            {tickers.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onToggleTicker(t)}
                disabled={tickers.length === 1}
                title={tickers.length === 1 ? 'At least one company is required' : `Remove ${nameOf(t)}`}
                className="flex shrink-0 items-center gap-2xs rounded-pill border border-line px-2xs py-2xs text-caption text-ink-soft transition-colors hover:border-ink-faint"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(t) }} />
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2xs">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous metric"
            className="rounded-control p-2xs text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              title="Choose a metric"
              className="flex max-w-44 items-center gap-2xs truncate rounded-control px-2xs py-2xs text-center text-label font-medium text-ink transition-colors hover:bg-surface-hover sm:max-w-xs"
            >
              <span className="truncate">{def.label}</span>
              <span aria-hidden="true" className="text-caption text-ink-faint">
                {pickerOpen ? '▴' : '▾'}
              </span>
            </button>
            {pickerOpen && (
              <MetricPicker
                tickers={tickers}
                currentId={def.id}
                onPick={onMetricId}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
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

      {/* the big visual */}
      <div
        className={
          'flex flex-1 items-center justify-center p-md sm:p-lg ' +
          (compact ? 'min-h-0 overflow-y-auto' : 'min-h-[52vh] overflow-y-auto')
        }
      >
        <div className="focus-fade w-full max-w-4xl">
          <FocusVisual def={def} tickers={tickers} ix={ix} compact={compact} />
        </div>
      </div>

      {infoOpen && <InfoModal def={def} figs={figs} onClose={() => setInfoOpen(false)} />}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* CompareFocus — one metric huge, or four focal points at once.        */
/* ------------------------------------------------------------------ */

export default function CompareFocus() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricId, setMetricId] = useState(DEFAULT_METRIC)
  const [quadMetrics, setQuadMetrics] = useState(QUAD_DEFAULTS)
  const [layout, setLayout] = useState('1') // '1' | '4'
  const [menuOpen, setMenuOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  )
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && effectiveTheme() === 'dark',
  )
  const rootRef = useRef(null)

  // In 4-up mode (desktop) the stage takes over the viewport: fixed,
  // exactly 100dvh, body scroll locked — the four quadrants always fit
  // with zero page scroll. Mobile keeps normal stacked flow.
  useEffect(() => {
    if (layout !== '4') return undefined
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => {
      document.body.style.overflow = mq.matches ? 'hidden' : ''
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      document.body.style.overflow = ''
      mq.removeEventListener('change', apply)
    }
  }, [layout])

  const toggleTicker = (t) => {
    setTickers((prev) => {
      if (prev.includes(t)) return prev.length === 1 ? prev : prev.filter((x) => x !== t)
      return prev.length >= MAX_COMPANIES ? prev : [...prev, t]
    })
  }

  const toggleTheme = () => {
    const next = !dark
    setTheme(next ? 'dark' : 'light')
    setDark(next)
  }

  const setQuadMetric = (i, id) => {
    setQuadMetrics((prev) => prev.map((m, j) => (j === i ? id : m)))
  }

  const menuProps = {
    tickers,
    onToggleTicker: toggleTicker,
    metricId,
    onSelectMetric: setMetricId,
    query,
    onQuery: setQuery,
  }

  return (
    <div
      ref={rootRef}
      className={
        'flex bg-bg ' +
        (layout === '4' ? 'min-h-[70vh] lg:fixed lg:inset-0 lg:z-50' : 'min-h-[70vh]')
      }
    >
      {/* ---- Desktop: collapsible side menu (animated width) ---- */}
      <div className="hidden h-full shrink-0 md:flex">
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
          className={`h-full overflow-hidden border-r border-line/60 bg-surface transition-[width] duration-300 ease-in-out ${
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
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* slim top bar: menu toggle + theme + layout switcher */}
        <div className="flex flex-wrap items-center gap-xs border-b border-line/60 px-sm py-xs">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-control p-2xs text-ink-soft hover:bg-surface-hover md:hidden"
          >
            <span aria-hidden="true" className="text-body">☰</span>
          </button>
          <span className="min-w-0 flex-1 truncate text-caption text-ink-faint">
            {tickers.length} compan{tickers.length === 1 ? 'y' : 'ies'} selected
            {layout === '4' ? ' · 4 focal points' : ''}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="flex shrink-0 items-center justify-center rounded-control border border-line p-2xs text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <div
            role="group"
            aria-label="Focal points"
            className="flex shrink-0 items-center rounded-pill border border-line p-2xs"
          >
            {[
              ['1', '1-up', 'One focal point'],
              ['4', '4-up', 'Four focal points'],
            ].map(([val, label, title]) => (
              <button
                key={val}
                type="button"
                onClick={() => setLayout(val)}
                aria-pressed={layout === val}
                title={title}
                className={
                  'rounded-pill px-sm py-2xs text-caption transition-colors ' +
                  (layout === val
                    ? 'bg-ink font-medium text-surface'
                    : 'text-ink-soft hover:text-ink')
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* focal area — in 4-up the grid is sized to the viewport so all four
            quadrants fit with no page scroll (desktop); mobile stacks freely */}
        <div
          className={
            'flex-1 p-md ' +
            (layout === '4'
              ? 'min-h-0 overflow-y-auto lg:overflow-hidden'
              : 'overflow-y-auto sm:p-lg')
          }
        >
          {layout === '1' ? (
            <FocalPoint
              tickers={tickers}
              metricId={metricId}
              onMetricId={setMetricId}
              onToggleTicker={toggleTicker}
              compact={false}
            />
          ) : (
            <div className="grid h-full min-h-0 gap-md lg:grid-cols-2 lg:grid-rows-2">
              {quadMetrics.map((qm, i) => (
                <FocalPoint
                  key={i}
                  tickers={tickers}
                  metricId={qm}
                  onMetricId={(id) => setQuadMetric(i, id)}
                  onToggleTicker={toggleTicker}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
