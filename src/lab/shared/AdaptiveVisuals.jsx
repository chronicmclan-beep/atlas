/*
  AdaptiveVisuals — shared stage renderers for the "Compare" Lab variant.

  Each renderer is a pure presentational stage: it takes resolved figures
  (or tickers) plus a focal-interaction instance (ix) and renders one
  design element large. Extracted from CompareFocus (dot scale, donut,
  cash-flow waterfall, bars, focal interaction), VariantDials (radial
  dials), VariantTimeline (timeline tape) and VariantArrowRace (arrow
  race) — one canonical copy each, no forks.

  Selection contract: every selected company ALWAYS renders. Missing
  figures are marked "Not sourced", never silently dropped.

  Data contract: figures resolve ONLY through src/lib/compareMetrics.js
  (callers pass resolved entries). Colors/names via companyGroups.js.
  Styling: Atlas theme tokens only, light/dark clean.
*/
import { useRef, useState } from 'react'
import { resolveFigure } from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { revenue as quarterlyRevenue } from '../../lib/data.js'
import { colorOf, nameOf } from './companyGroups.js'
import CompanyBadge from '../../components/common/CompanyBadge.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'

/* ------------------------------------------------------------------ */
/* Focal interaction — hover highlight, click-to-isolate, tooltip.     */
/* ------------------------------------------------------------------ */

export function useFocalInteraction() {
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

export function ChartTip({ tip }) {
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

export function IsolateReset({ isolated, onClear }) {
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

/** Index of the leader among parseable figures, or -1 when no ▲ applies. */
export function leaderIndex(def, entries) {
  if (!def || def.higherIsBetter == null) return -1
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
/* Bars — the fallback visual. One row per company.                     */
/* ------------------------------------------------------------------ */

export function BarsStage({ entries, lead, ix, note }) {
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
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ranked bars — valuation multiples. Sorted low→high with a median     */
/* marker tick on every track. For multiples, cheaper (lower) first.    */
/* Companies without a value get an explicit "Not sourced" line.        */
/* ------------------------------------------------------------------ */

const NEG_RED = '#c05a4e'

export function RankedBarsStage({ entries, ix, caption }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
    .sort((a, b) => a.v - b.v)
  const missing = entries.filter((e) => parseScalar(e.fig?.value) == null)
  const vals = scored.map((s) => s.v)
  const lo = vals.length ? vals[0] : 0
  const hi = vals.length ? vals[vals.length - 1] : 1
  const span = hi - lo || 1
  const median = vals.length
    ? vals.length % 2 === 1
      ? vals[(vals.length - 1) / 2]
      : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
    : 0
  const medPct = ((median - lo) / span) * 100
  return (
    <div
      ref={ix.rootRef}
      className="relative grid w-full gap-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      {caption && (
        <p className="text-center text-caption text-ink-faint">
          {caption} <span className="whitespace-nowrap">▏ marks the group median.</span>
        </p>
      )}
      {scored.map(({ e, v }) => {
        const pct = Math.max(6, ((v - lo) / span) * 100)
        // Row label shows the headline figure only (e.g. "48.8x"); the full
        // derivation stays in the hover tooltip.
        const short = String(e.fig.value).split(' ')[0]
        return (
          <div
            key={e.ticker}
            {...ix.segmentProps(e.ticker, [nameOf(e.ticker), e.fig.value])}
            className="flex items-center gap-sm"
          >
            <span className="flex w-36 shrink-0 items-center gap-xs">
              <CompanyBadge name={e.ticker} size={24} />
              <span className="truncate font-medium text-body" style={{ color: colorOf(e.ticker) }}>
                {nameOf(e.ticker)}
              </span>
            </span>
            <div className="relative h-6 min-w-6 flex-1 rounded-pill bg-surface-raised">
              <div
                className="h-full rounded-pill transition-all duration-500"
                style={{ width: `${pct}%`, background: colorOf(e.ticker) }}
              />
              <div
                aria-hidden="true"
                title="Group median"
                className="absolute inset-y-1 w-px bg-ink-faint"
                style={{ left: `${medPct}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-body text-ink">{short}</span>
            <SourceTag tier={e.fig.tier} showLabel={false} />
          </div>
        )
      })}
      {missing.map((e) => (
        <div key={e.ticker} className="flex items-center gap-sm opacity-60">
          <span className="flex w-36 shrink-0 items-center gap-xs">
            <CompanyBadge name={e.ticker} size={24} />
            <span className="truncate font-medium text-body" style={{ color: colorOf(e.ticker) }}>
              {nameOf(e.ticker)}
            </span>
          </span>
          <span className="flex-1 italic text-ink-faint text-body">
            {e.fig ? e.fig.value : 'Not sourced'}
          </span>
        </div>
      ))}
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Diverging bars — growth rates. A zero baseline; positive growth      */
/* extends right in company colors, decline extends left in muted red.  */
/* ------------------------------------------------------------------ */

export function DivergingBarsStage({ entries, ix }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
    .sort((a, b) => b.v - a.v)
  const missing = entries.filter((e) => parseScalar(e.fig?.value) == null)
  const maxAbs = Math.max(...scored.map((s) => Math.abs(s.v)), 1e-9)
  return (
    <div
      ref={ix.rootRef}
      className="relative grid w-full gap-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      <p className="text-center text-caption text-ink-faint">
        Right of zero is growth, left of zero is decline.
      </p>
      {scored.map(({ e, v }) => {
        const w = Math.max(2, (Math.abs(v) / maxAbs) * 100)
        // Headline figure only (e.g. "+65.5%"); the full string is in the tooltip.
        const short = String(e.fig.value).split(' ')[0]
        return (
          <div
            key={e.ticker}
            {...ix.segmentProps(e.ticker, [nameOf(e.ticker), e.fig.value])}
            className="flex items-center gap-sm"
          >
            <span className="flex w-36 shrink-0 items-center gap-xs">
              <CompanyBadge name={e.ticker} size={24} />
              <span className="truncate font-medium text-body" style={{ color: colorOf(e.ticker) }}>
                {nameOf(e.ticker)}
              </span>
            </span>
            <div className="flex min-w-0 flex-1 items-center">
              <div className="relative h-6 min-w-0 flex-1">
                {v < 0 && (
                  <div
                    className="absolute right-0 top-0 h-full rounded-l-pill transition-all duration-500"
                    style={{ width: `${w}%`, background: NEG_RED }}
                  />
                )}
              </div>
              <div aria-hidden="true" className="h-9 w-px shrink-0 bg-line-strong" />
              <div className="relative h-6 min-w-0 flex-1">
                {v >= 0 && (
                  <div
                    className="absolute left-0 top-0 h-full rounded-r-pill transition-all duration-500"
                    style={{ width: `${w}%`, background: colorOf(e.ticker) }}
                  />
                )}
              </div>
            </div>
            <span className="w-20 shrink-0 text-right text-body font-medium text-ink">
              {short}
            </span>
            <SourceTag tier={e.fig.tier} showLabel={false} />
          </div>
        )
      })}
      {missing.map((e) => (
        <div key={e.ticker} className="flex items-center gap-sm opacity-60">
          <span className="flex w-36 shrink-0 items-center gap-xs">
            <CompanyBadge name={e.ticker} size={24} />
            <span className="truncate font-medium text-body" style={{ color: colorOf(e.ticker) }}>
              {nameOf(e.ticker)}
            </span>
          </span>
          <span className="flex-1 italic text-ink-faint text-body">
            {e.fig ? e.fig.value : 'Not sourced'}
          </span>
        </div>
      ))}
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dot-on-scale — valuation multiples. Dots on a shared axis.           */
/* Collision-aware lanes keep numbered dots from ever overlapping.      */
/* Companies without a value get an explicit "Not sourced" line.        */
/* ------------------------------------------------------------------ */

export function DotScaleStage({ entries, ix }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null)
    .sort((a, b) => a.v - b.v)
  const missing = entries.filter((e) => parseScalar(e.fig?.value) == null)
  if (scored.length < 2) {
    return (
      <BarsStage
        entries={entries}
        lead={-1}
        ix={ix}
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

  const dots = scored.map((s, i) => ({ ...s, n: i + 1, left: pos(s.v), lane: 0 }))
  const lanes = []
  dots.forEach((d) => {
    let lane = 0
    while (lanes[lane]?.some((o) => Math.abs(o.left - d.left) < 9)) lane += 1
    d.lane = lane
    ;(lanes[lane] ??= []).push(d)
  })
  const laneDy = [0, -30, 30, -58]

  return (
    <div
      ref={ix.rootRef}
      className="relative w-full px-sm py-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
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
/* Share donut — part-of-whole across the selected companies.           */
/* Tickers in the legend (full names truncated in narrow layouts).      */
/* ------------------------------------------------------------------ */

export function ShareDonutStage({ entries, lead, ix }) {
  const scored = entries
    .map((e) => ({ e, v: parseScalar(e.fig?.value) }))
    .filter((s) => s.v != null && s.v > 0)
  const total = scored.reduce((a, s) => a + s.v, 0)
  const R = 46
  const C = 2 * Math.PI * R
  let acc = 0
  const leader =
    lead >= 0 ? entries[lead] : scored.length > 0 ? scored.reduce((a, b) => (b.v > a.v ? b : a)).e : null
  return (
    <div
      ref={ix.rootRef}
      className="relative flex w-full flex-col items-center gap-lg sm:flex-row sm:gap-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      <div className="relative h-72 w-72 shrink-0 sm:h-96 sm:w-96">
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
      <ul className="grid w-full min-w-0 max-w-sm gap-sm">
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
              className={'flex items-center gap-sm text-body' + (ok ? '' : ' opacity-60')}
            >
              <CompanyBadge name={e.ticker} size={26} />
              <span className="truncate font-medium" style={{ color: colorOf(e.ticker) }}>
                {e.ticker}
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
/* Cash-flow waterfall — revenue → operating cash flow → capex → free   */
/* cash flow, per company. Capex is an outflow (red).                   */
/* ------------------------------------------------------------------ */

const FLOW_STEPS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'ocf', label: 'Operating cash flow' },
  { id: 'capex', label: 'Capex (outflow)' },
  { id: 'fcf', label: 'Free cash flow' },
]

export function CashFlowStage({ tickers, ix }) {
  const rows = tickers.map((ticker) => ({
    ticker,
    figs: FLOW_STEPS.map((s) => resolveFigure(s.id, ticker)),
  }))
  const allVals = rows.flatMap((r) => r.figs.map((f) => Math.abs(parseScalar(f?.value) ?? 0)))
  const max = Math.max(...allVals, 1e-9)
  return (
    <div
      ref={ix.rootRef}
      className="relative grid w-full gap-lg"
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
            className={'rounded-card bg-surface-raised p-md' + (interactive ? '' : ' opacity-70')}
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
/* Radial dials — percentage metrics, one clock-face dial per company.  */
/* Percentages ride a 0–100 scale; absolutes normalize honestly to      */
/* "share of leader".                                                  */
/* ------------------------------------------------------------------ */

const DIAL_SIZE = 172
const DIAL_C = DIAL_SIZE / 2
const DIAL_R = 64
const DIAL_NEEDLE = 52

function dialPolar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function dialArc(cx, cy, r, frac) {
  const f = Math.max(0, Math.min(1, frac))
  if (f <= 0) return ''
  if (f >= 1) {
    return (
      `M ${cx} ${cy - r} ` +
      `A ${r} ${r} 0 1 1 ${cx} ${cy + r} ` +
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`
    )
  }
  const [x0, y0] = dialPolar(cx, cy, r, 0)
  const [x1, y1] = dialPolar(cx, cy, r, f * 360)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x1} ${y1}`
}

function DialFace({ ticker, fig, scaleMax, ix }) {
  const color = colorOf(ticker)
  const n = parseScalar(fig.value)
  const frac = scaleMax > 0 && n != null ? Math.max(0, Math.min(1, n / scaleMax)) : 0
  const needleAngle = frac * 360
  const seg = ix.segmentProps(ticker, [nameOf(ticker), fig.value])
  const marks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div {...seg} className="flex w-full flex-col items-center">
      <svg
        width={DIAL_SIZE}
        height={DIAL_SIZE}
        viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
        role="img"
        aria-label={`${ticker}: ${fig.value}`}
        className="text-ink"
      >
        <circle cx={DIAL_C} cy={DIAL_C} r={DIAL_R} fill="none" stroke="currentColor" strokeWidth={7} opacity={0.12} />
        <path
          d={dialArc(DIAL_C, DIAL_C, DIAL_R, frac)}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        {marks.map((f) => {
          const a = f * 360
          const [x1, y1] = dialPolar(DIAL_C, DIAL_C, DIAL_R - 6, a)
          const [x2, y2] = dialPolar(DIAL_C, DIAL_C, DIAL_R - 14, a)
          const [lx, ly] = dialPolar(DIAL_C, DIAL_C, DIAL_R + 16, a)
          return (
            <g key={f}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="fill-ink-faint" fontSize={9.5} fontWeight={500}>
                {Math.round(scaleMax * f)}
              </text>
            </g>
          )
        })}
        <g
          className="transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${DIAL_C}px ${DIAL_C}px` }}
        >
          <line x1={DIAL_C} y1={DIAL_C} x2={DIAL_C} y2={DIAL_C - DIAL_NEEDLE} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        </g>
        <circle cx={DIAL_C} cy={DIAL_C} r={7} fill={color} />
        <circle cx={DIAL_C} cy={DIAL_C} r={7} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.25} />
        <text x={DIAL_C} y={DIAL_C + 30} textAnchor="middle" className="fill-ink" fontSize={17} fontWeight={700}>
          {fig.value}
        </text>
        {fig.sub && (
          <text x={DIAL_C} y={DIAL_C + 46} textAnchor="middle" className="fill-ink-faint" fontSize={10}>
            {fig.sub}
          </text>
        )}
      </svg>
      <div className="mt-2xs text-center">
        <div className="flex items-center justify-center gap-2xs text-label font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {ticker}
        </div>
        <div className="text-caption text-ink-soft">{nameOf(ticker)}</div>
      </div>
    </div>
  )
}

function DialMissing({ ticker }) {
  return (
    <div className="flex w-full flex-col items-center opacity-70">
      <svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`} role="img" aria-label={`${ticker}: no sourced figure`} className="text-ink-faint">
        <circle cx={DIAL_C} cy={DIAL_C} r={DIAL_R} fill="none" stroke="currentColor" strokeWidth={7} opacity={0.18} />
        <text x={DIAL_C} y={DIAL_C - 6} textAnchor="middle" className="fill-ink-soft" fontSize={12} fontWeight={600}>
          Not sourced
        </text>
        <text x={DIAL_C} y={DIAL_C + 16} textAnchor="middle" className="fill-ink-faint" fontSize={10.5}>
          for this metric
        </text>
      </svg>
      <div className="mt-2xs text-center">
        <div className="flex items-center justify-center gap-2xs text-label font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(ticker) }} />
          {ticker}
        </div>
        <div className="text-caption text-ink-soft">{nameOf(ticker)}</div>
      </div>
    </div>
  )
}

export function DialStage({ entries, ix }) {
  const withVal = entries.filter((e) => e.fig && e.fig.value != null)
  const isPercent =
    withVal.length > 0 &&
    withVal.every((f) => typeof f.fig.value === 'string' && /%/.test(f.fig.value))
  const nums = withVal
    .map((f) => parseScalar(f.fig.value))
    .filter((n) => n != null)
    .map((n) => Math.max(0, n))
  const leaderMax = nums.length > 0 ? Math.max(...nums) : 0
  const scaleMax = isPercent ? 100 : leaderMax
  return (
    <div
      ref={ix.rootRef}
      className="relative w-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      <div className="flex justify-end">
        <span className="rounded-pill border border-line px-sm py-2xs text-caption text-ink-faint">
          Scale: {isPercent ? '0–100' : 'share of leader'}
        </span>
      </div>
      <div
        className="mt-sm grid gap-md"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        {entries.map((e) =>
          e.fig && e.fig.value != null ? (
            <DialFace key={e.ticker} ticker={e.ticker} fig={e.fig} scaleMax={scaleMax} ix={ix} />
          ) : (
            <DialMissing key={e.ticker} ticker={e.ticker} />
          ),
        )}
      </div>
      <ChartTip tip={ix.tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Timeline tape — quarterly revenue as milestone timelines. One        */
/* colored tape per company; tape thickness and node size encode        */
/* quarter-over-quarter growth. Thin series render "Not sourced".       */
/* ------------------------------------------------------------------ */

const TAPE_QUARTERS = quarterlyRevenue.quarters ?? []
const TAPE_NQ = TAPE_QUARTERS.length

function tapeXPct(i) {
  return TAPE_NQ > 1 ? 3 + (i / (TAPE_NQ - 1)) * 94 : 50
}
function tapeFmtB(v) {
  return '$' + v.toFixed(2) + 'B'
}
function tapeFmtPct(g) {
  const sign = g >= 0 ? '+' : ''
  return sign + (g * 100).toFixed(1) + '%'
}
function tapeFor(ticker) {
  const s = quarterlyRevenue.series.find((x) => x.ticker === ticker)
  if (!s) return null
  const pts = []
  s.revenue.forEach((v, i) => {
    if (v != null && v > 0) pts.push({ i, v })
  })
  if (pts.length < 2) return null
  const segs = []
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k]
    const b = pts[k + 1]
    segs.push({ from: a, to: b, g: (b.v - a.v) / a.v })
  }
  return { pts, segs }
}

export function TimelineTapeStage({ tickers }) {
  const [hover, setHover] = useState(null)

  const tapes = (() => {
    const list = tickers
      .map((t) => ({ ticker: t, tape: tapeFor(t) }))
      .filter((e) => e.tape)
    const allG = list.flatMap((e) => e.tape.segs.map((s) => s.g))
    const lo = allG.length ? Math.min(...allG) : 0
    const hi = allG.length ? Math.max(...allG) : 1
    const norm = (g) => (hi > lo ? (g - lo) / (hi - lo) : 0.5)
    return list.map((e) => ({
      ...e,
      growthOf: (k) =>
        norm(k < e.tape.segs.length ? e.tape.segs[k].g : e.tape.segs[e.tape.segs.length - 1].g),
    }))
  })()

  const missing = tickers.filter((t) => !tapeFor(t))
  const axisIdx = TAPE_QUARTERS.map((_, i) => i).filter((i) => i % 4 === 0)

  return (
    <div>
      <style>{`
        @keyframes tapeIn { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
        @keyframes nodePop { from { opacity: 0; transform: translate(-50%,-50%) scale(0.4); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        .tape-in { animation: tapeIn 0.45s ease both; }
        .tape-node { animation: nodePop 0.35s ease both; }
        @media (prefers-reduced-motion: reduce) { .tape-in, .tape-node { animation: none; } }
      `}</style>
      <div className="grid gap-md">
        {tapes.map(({ ticker, tape, growthOf }) => {
          const color = colorOf(ticker)
          const first = tape.pts[0]
          const last = tape.pts[tape.pts.length - 1]
          const latestG = tape.segs.length > 0 ? tape.segs[tape.segs.length - 1].g : null
          return (
            <div key={ticker} className="tape-in rounded-card border border-line bg-surface-raised p-md sm:p-lg">
              <div className="flex flex-wrap items-baseline justify-between gap-xs">
                <div className="flex items-center gap-2xs">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} aria-hidden="true" />
                  <span className="text-label font-semibold text-ink">{nameOf(ticker)}</span>
                  <span className="text-caption text-ink-faint">{ticker}</span>
                </div>
                <div className="flex items-baseline gap-xs text-caption">
                  <span className="font-semibold text-ink">{tapeFmtB(last.v)}</span>
                  <span className="text-ink-faint">{TAPE_QUARTERS[last.i]}</span>
                  {latestG != null && (
                    <span className="rounded-pill px-2xs py-2xs font-medium" style={{ color, background: color + '1A' }}>
                      {tapeFmtPct(latestG)} QoQ
                    </span>
                  )}
                </div>
              </div>
              <div className="relative mt-sm h-32 select-none" role="img" aria-label={`${nameOf(ticker)} quarterly revenue timeline`}>
                {tape.segs.map((s, k) => {
                  const n = growthOf(k)
                  const h = 4 + 10 * n
                  return (
                    <div
                      key={k}
                      aria-hidden="true"
                      className="absolute rounded-full"
                      style={{
                        left: tapeXPct(s.from.i) + '%',
                        width: Math.max(0.5, tapeXPct(s.to.i) - tapeXPct(s.from.i)) + '%',
                        top: '50%',
                        height: h,
                        transform: 'translateY(-50%)',
                        background: color,
                        opacity: 0.45 + 0.5 * n,
                      }}
                    />
                  )
                })}
                {tape.pts.map((p, k) => {
                  const n = growthOf(k)
                  const d = 10 + 12 * n
                  const active = hover && hover.ticker === ticker && hover.k === k
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-label={`${nameOf(ticker)}, ${TAPE_QUARTERS[p.i]}: revenue ${tapeFmtB(p.v)}`}
                      onMouseEnter={() => setHover({ ticker, k })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ ticker, k })}
                      onBlur={() => setHover(null)}
                      className="tape-node absolute rounded-full border-2 border-white shadow-card transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      style={{
                        left: tapeXPct(p.i) + '%',
                        top: '50%',
                        width: d,
                        height: d,
                        transform: 'translate(-50%, -50%)',
                        background: color,
                        animationDelay: Math.min(k * 35, 500) + 'ms',
                        zIndex: active ? 20 : 10,
                      }}
                    />
                  )
                })}
                <div className="pointer-events-none absolute top-0 whitespace-nowrap text-caption font-semibold text-ink" style={{ left: tapeXPct(first.i) + '%', transform: 'translateX(-8px)' }}>
                  {tapeFmtB(first.v)}
                </div>
                <div className="pointer-events-none absolute top-0 whitespace-nowrap text-caption font-semibold text-ink" style={{ left: tapeXPct(last.i) + '%', transform: 'translateX(calc(-100% + 8px))' }}>
                  {tapeFmtB(last.v)}
                </div>
                {axisIdx.map((i) => (
                  <div key={i} className="pointer-events-none absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-caption text-ink-faint" style={{ left: tapeXPct(i) + '%' }}>
                    {TAPE_QUARTERS[i]}
                  </div>
                ))}
                {hover && hover.ticker === ticker && (
                  <div
                    className="pointer-events-none absolute z-30 w-max max-w-56 -translate-x-1/2 rounded-control border border-line bg-surface px-sm py-xs shadow-card"
                    style={{
                      left: Math.min(92, Math.max(8, tapeXPct(tape.pts[hover.k].i))) + '%',
                      top: '50%',
                      transform: 'translate(-50%, calc(-100% - 14px))',
                    }}
                  >
                    <div className="text-label font-medium text-ink">
                      {TAPE_QUARTERS[tape.pts[hover.k].i]} · {tapeFmtB(tape.pts[hover.k].v)}
                    </div>
                    <div className="text-caption text-ink-soft">
                      {hover.k > 0 ? `${tapeFmtPct(tape.segs[hover.k - 1].g)} vs prior quarter` : 'Earliest reported quarter in series'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {missing.map((t) => (
          <div key={t} className="tape-in flex items-center gap-2xs rounded-card border border-dashed border-line bg-surface-raised p-md">
            <span className="h-3 w-3 rounded-full" style={{ background: colorOf(t) }} aria-hidden="true" />
            <span className="text-label font-medium text-ink">{nameOf(t)}</span>
            <span className="text-caption italic text-ink-faint">Not sourced — no quarterly series</span>
          </div>
        ))}
      </div>
      <p className="mt-sm text-center text-caption text-ink-faint">
        Reported quarterly revenue, US$ billions · Fiscal and calendar quarters are not strictly aligned across companies.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Arrow race — companies as chevron arrows, length proportional to     */
/* value, ranked top-to-bottom. Missing figures get a slim dashed       */
/* "Not sourced" row — never silently dropped.                         */
/* ------------------------------------------------------------------ */

const CHEVRON = 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
const MIN_PCT = 8

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

export function ArrowRaceStage({ entries, def, ix }) {
  const desc = def?.higherIsBetter === false

  const ranked = entries
    .map((e) => {
      if (!e.fig || e.fig.value == null) return null
      const n = parseScalar(e.fig.value)
      return n == null || n <= 0 ? null : { e, n }
    })
    .filter(Boolean)
    .sort((a, b) => (desc ? a.n - b.n : b.n - a.n))

  const missing = entries.filter((e) => !ranked.some((r) => r.e.ticker === e.ticker))
  const leaderN = ranked.length > 0 ? ranked[0].n : 0

  return (
    <div
      ref={ix.rootRef}
      className="relative grid gap-sm overflow-x-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) ix.clearIsolate()
      }}
    >
      <IsolateReset isolated={ix.isolated} onClear={ix.clearIsolate} />
      {ranked.map(({ e, n }, i) => {
        const color = colorOf(e.ticker)
        const pct = leaderN > 0 ? Math.max(MIN_PCT, Math.min(100, (desc ? leaderN / n : n / leaderN) * 100)) : MIN_PCT
        const share = Math.round((desc ? leaderN / n : n / leaderN) * 100)
        const inside = pct >= 32
        return (
          <div key={e.ticker} className="flex items-center gap-sm" {...ix.segmentProps(e.ticker, [nameOf(e.ticker), e.fig.value])}>
            <div className="flex w-24 shrink-0 items-center gap-2xs sm:w-28">
              <span className="w-8 shrink-0 text-eyebrow uppercase text-ink-faint">{ordinal(i + 1)}</span>
              <span className="truncate rounded-pill px-2xs py-2xs text-caption font-medium text-white" style={{ background: color }} title={nameOf(e.ticker)}>
                {e.ticker}
              </span>
            </div>
            <div className="relative h-12 min-w-0 flex-1">
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${pct}%`, background: color, clipPath: CHEVRON, opacity: ix.opacityFor(e.ticker) }}
                title={`${nameOf(e.ticker)} — ${e.fig.value} (${share}% of leader)`}
              >
                {inside ? (
                  <div className="absolute inset-y-0 right-4 flex flex-col items-end justify-center leading-tight text-white">
                    <span className="whitespace-nowrap text-label font-semibold">{e.fig.value}</span>
                    <span className="whitespace-nowrap text-caption text-white/80">{share}% of leader</span>
                  </div>
                ) : (
                  <div className="absolute top-1/2 flex -translate-y-1/2 flex-col justify-center leading-tight" style={{ left: 'calc(100% + 8px)' }}>
                    <span className="whitespace-nowrap text-label font-semibold text-ink">{e.fig.value}</span>
                    <span className="whitespace-nowrap text-caption text-ink-faint">{share}% of leader</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
      {missing.map((e) => (
        <div key={e.ticker} className="flex items-center gap-sm">
          <div className="flex w-24 shrink-0 items-center gap-2xs sm:w-28">
            <span className="w-8 shrink-0 text-eyebrow uppercase text-ink-faint">—</span>
            <span className="truncate rounded-pill px-2xs py-2xs text-caption font-medium text-white" style={{ background: colorOf(e.ticker) }} title={nameOf(e.ticker)}>
              {e.ticker}
            </span>
          </div>
          <div className="flex h-12 min-w-0 flex-1 items-center rounded-control border border-dashed border-line px-sm">
            <span className="truncate text-caption text-ink-faint">
              {e.fig && e.fig.value != null ? `${e.fig.value} — not chartable on this scale` : 'Not sourced — no figure for this metric'}
            </span>
          </div>
        </div>
      ))}
      <ChartTip tip={ix.tip} />
    </div>
  )
}
