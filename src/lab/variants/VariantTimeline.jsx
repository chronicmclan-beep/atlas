/*
  Lab variant — "Timeline tape" (Infographic elements experiment).

  Quarterly revenue drawn as a horizontal milestone timeline, not a line
  chart: one colored tape per selected company (up to 4), with a node per
  reported quarter. Hovering a node shows that quarter's value; the first
  and last values are labeled. Tape segments thicken and nodes grow where
  quarter-over-quarter growth is faster, so acceleration reads visually.

  Data contract: figures resolve ONLY from the datasets (revenue.quarters
  + revenue.series, and resolveFigure for the latest-quarter readouts).
  Nothing is hardcoded. A tape needs at least 2 non-null quarters, or the
  row shows a "Not sourced" state.
*/
import { useMemo, useState } from 'react'
import { CompanyPicker, InfoButton } from '../shared/LabShared.jsx'
import { colorOf, nameOf, MAX_COMPANIES } from '../shared/companyGroups.js'
import { METRICS, resolveFigure, describeGap } from '../../lib/compareMetrics.js'
import { revenue } from '../../lib/data.js'

const QUARTERS = revenue.quarters
const NQ = QUARTERS.length // number of quarter slots on the tape
const LATEST_Q = METRICS.find((m) => m.id === 'latest-quarter')

/** Percent position of quarter index i along the tape. */
function xPct(i) {
  return 3 + (i / (NQ - 1)) * 94
}

function fmtB(v) {
  return '$' + v.toFixed(2) + 'B'
}

function fmtPct(g) {
  const sign = g >= 0 ? '+' : ''
  return sign + (g * 100).toFixed(1) + '%'
}

/** Build tape geometry for one ticker: null when the series is too thin. */
function tapeFor(ticker) {
  const s = revenue.series.find((x) => x.ticker === ticker)
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

export default function VariantTimeline() {
  const [tickers, setTickers] = useState(['NVDA', 'AMD'])
  const [hover, setHover] = useState(null) // { ticker, k } of the hovered node

  const toggle = (t) =>
    setTickers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const tapes = useMemo(() => {
    const list = tickers
      .map((t) => ({ ticker: t, tape: tapeFor(t) }))
      .filter((e) => e.tape)
    const allG = list.flatMap((e) => e.tape.segs.map((s) => s.g))
    const lo = Math.min(...allG)
    const hi = Math.max(...allG)
    const norm = (g) => (hi > lo ? (g - lo) / (hi - lo) : 0.5)
    return list.map((e) => ({
      ...e,
      growthOf: (k) =>
        norm(k < e.tape.segs.length ? e.tape.segs[k].g : e.tape.segs[e.tape.segs.length - 1].g),
    }))
  }, [tickers])

  const missing = tickers.filter((t) => !tapeFor(t))

  const figs = tickers.map((t) => resolveFigure('latest-quarter', t)).filter(Boolean)
  const takeaway = LATEST_Q ? describeGap(LATEST_Q, figs) : ''

  const axisIdx = QUARTERS.map((_, i) => i).filter((i) => i % 4 === 0)

  return (
    <div>
      <style>{`
        @keyframes tapeIn { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
        @keyframes nodePop { from { opacity: 0; transform: translate(-50%,-50%) scale(0.4); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        .tape-in { animation: tapeIn 0.45s ease both; }
        .tape-node { animation: nodePop 0.35s ease both; }
        @media (prefers-reduced-motion: reduce) { .tape-in, .tape-node { animation: none; } }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-sm">
        <div>
          <div className="text-eyebrow uppercase text-ink-faint">Infographic · Timeline tape</div>
          <h2 className="mt-2xs text-title font-semibold text-ink">
            Quarterly revenue, quarter by quarter
          </h2>
          <p className="mt-2xs text-caption text-ink-soft">
            Thicker tape and larger nodes mark stretches of faster quarter-over-quarter growth.
          </p>
        </div>
        <InfoButton def={LATEST_Q} figs={figs} label="About quarterly revenue" />
      </div>

      {/* Company picker */}
      <div className="mt-md max-w-xl">
        <CompanyPicker tickers={tickers} onToggle={toggle} max={MAX_COMPANIES} />
      </div>

      {/* Tapes */}
      <div className="mt-md grid gap-md">
        {tapes.map(({ ticker, tape, growthOf }) => {
          const color = colorOf(ticker)
          const first = tape.pts[0]
          const last = tape.pts[tape.pts.length - 1]
          const latestG =
            tape.segs.length > 0 ? tape.segs[tape.segs.length - 1].g : null
          return (
            <div
              key={ticker}
              className="tape-in rounded-card border border-line bg-surface p-md sm:p-lg"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-xs">
                <div className="flex items-center gap-2xs">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <span className="text-label font-semibold text-ink">{nameOf(ticker)}</span>
                  <span className="text-caption text-ink-faint">{ticker}</span>
                </div>
                <div className="flex items-baseline gap-xs text-caption">
                  <span className="font-semibold text-ink">{fmtB(last.v)}</span>
                  <span className="text-ink-faint">{QUARTERS[last.i]}</span>
                  {latestG != null && (
                    <span
                      className="rounded-pill px-2xs py-2xs font-medium"
                      style={{ color, background: color + '1A' }}
                    >
                      {fmtPct(latestG)} QoQ
                    </span>
                  )}
                </div>
              </div>

              <div className="relative mt-sm h-32 select-none" role="img"
                aria-label={`${nameOf(ticker)} quarterly revenue timeline, ${QUARTERS[first.i]} to ${QUARTERS[last.i]}`}>
                {/* Tape segments — thickness encodes growth */}
                {tape.segs.map((s, k) => {
                  const n = growthOf(k)
                  const h = 4 + 10 * n
                  return (
                    <div
                      key={k}
                      aria-hidden="true"
                      className="absolute rounded-full"
                      style={{
                        left: xPct(s.from.i) + '%',
                        width: Math.max(0.5, xPct(s.to.i) - xPct(s.from.i)) + '%',
                        top: '50%',
                        height: h,
                        transform: 'translateY(-50%)',
                        background: color,
                        opacity: 0.45 + 0.5 * n,
                      }}
                    />
                  )
                })}

                {/* Nodes */}
                {tape.pts.map((p, k) => {
                  const n = growthOf(k)
                  const d = 10 + 12 * n
                  const active = hover && hover.ticker === ticker && hover.k === k
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-label={`${nameOf(ticker)}, ${QUARTERS[p.i]}: revenue ${fmtB(p.v)}`}
                      onMouseEnter={() => setHover({ ticker, k })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ ticker, k })}
                      onBlur={() => setHover(null)}
                      className="tape-node absolute rounded-full border-2 border-white shadow-card transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      style={{
                        left: xPct(p.i) + '%',
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

                {/* First / last value labels */}
                <div
                  className="pointer-events-none absolute top-0 whitespace-nowrap text-caption font-semibold text-ink"
                  style={{ left: xPct(first.i) + '%', transform: 'translateX(-8px)' }}
                >
                  {fmtB(first.v)}
                </div>
                <div
                  className="pointer-events-none absolute top-0 whitespace-nowrap text-caption font-semibold text-ink"
                  style={{ left: xPct(last.i) + '%', transform: 'translateX(calc(-100% + 8px))' }}
                >
                  {fmtB(last.v)}
                </div>

                {/* Quarter axis — sparse labels */}
                {axisIdx.map((i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-caption text-ink-faint"
                    style={{ left: xPct(i) + '%' }}
                  >
                    {QUARTERS[i]}
                  </div>
                ))}

                {/* Tooltip */}
                {hover && hover.ticker === ticker && (
                  <div
                    className="pointer-events-none absolute z-30 w-max max-w-56 -translate-x-1/2 rounded-control border border-line bg-surface px-sm py-xs shadow-card"
                    style={{
                      left: Math.min(92, Math.max(8, xPct(tape.pts[hover.k].i))) + '%',
                      top: '50%',
                      transform: 'translate(-50%, calc(-100% - 14px))',
                    }}
                  >
                    <div className="text-label font-medium text-ink">
                      {QUARTERS[tape.pts[hover.k].i]} · {fmtB(tape.pts[hover.k].v)}
                    </div>
                    <div className="text-caption text-ink-soft">
                      {hover.k > 0
                        ? `${fmtPct(tape.segs[hover.k - 1].g)} vs prior quarter`
                        : 'Earliest reported quarter in series'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Thin-series rows */}
        {missing.map((t) => (
          <div
            key={t}
            className="tape-in flex items-center gap-2xs rounded-card border border-dashed border-line bg-surface p-md"
          >
            <span className="h-3 w-3 rounded-full" style={{ background: colorOf(t) }} aria-hidden="true" />
            <span className="text-label font-medium text-ink">{nameOf(t)}</span>
            <span className="text-caption italic text-ink-faint">
              Not sourced — no quarterly series
            </span>
          </div>
        ))}
      </div>

      {/* Takeaway + caveats */}
      <div className="mt-md rounded-card border border-line bg-surface-raised p-md">
        <div className="text-eyebrow uppercase text-ink-faint">Reading the tapes</div>
        {takeaway && <p className="mt-2xs text-body text-ink">{takeaway}</p>}
        <p className="mt-sm text-caption leading-relaxed text-ink-faint">
          Quarter labels are not strictly aligned across companies — some report fiscal
          quarters on different year-ends, so the same label can cover different months.
          Values are quarterly total revenue in US$ billions, from primary filings.
        </p>
      </div>
    </div>
  )
}
