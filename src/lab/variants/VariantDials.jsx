/*
  VariantDials — "Dials" infographic variant (Atlas Section 09 "The Lab").

  Clock-face radial dials in the style of infographic "time indicator"
  sheets: one dial per selected company, a circular labeled scale with a
  needle and an arc fill in the company color. Percentage metrics
  (margins, growth, returns) ride a 0–100 scale directly; absolute metrics
  are normalized to the strongest selected figure, labeled honestly as
  "share of leader". Companies with no sourced figure always render a
  "Not sourced" placeholder dial — never silently dropped.

  Data contract: figures resolve ONLY through src/lib/compareMetrics.js
  (resolveFigure). Colors/names via companyGroups.js — never invented.
  Styling: Atlas theme tokens only, light/dark clean.
*/
import { useMemo, useState } from 'react'
import {
  CompanyPicker,
  MetricDropdown,
  InfoButton,
  parseScalar,
} from '../shared/LabShared.jsx'
import { colorOf, nameOf, MAX_COMPANIES } from '../shared/companyGroups.js'
import {
  METRICS,
  resolveFigure,
  describeGap,
} from '../../lib/compareMetrics.js'

const DEFAULT_TICKERS = ['NVDA', 'AMD']
const DEFAULT_METRIC = 'gross-margin'

/* Dial geometry */
const SIZE = 172
const C = SIZE / 2
const R_TRACK = 64
const R_NEEDLE = 52
const START_ANGLE = -90 // 12 o'clock, degrees; values sweep clockwise

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg + START_ANGLE) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/* Full-circle arc path from the top, sweeping clockwise to frac (0..1). */
function arcPath(cx, cy, r, frac) {
  const f = Math.max(0, Math.min(1, frac))
  if (f <= 0) return ''
  if (f >= 1) {
    // Full circle: two arcs so the path closes.
    return (
      `M ${cx} ${cy - r} ` +
      `A ${r} ${r} 0 1 1 ${cx} ${cy + r} ` +
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`
    )
  }
  const [x0, y0] = polar(cx, cy, r, 0)
  const [x1, y1] = polar(cx, cy, r, f * 360)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x1} ${y1}`
}

/* Tick labels around the face for a 0..max scale. */
function TickMarks({ max }) {
  const marks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <g>
      {marks.map((f) => {
        const a = f * 360
        const [x1, y1] = polar(C, C, R_TRACK - 6, a)
        const [x2, y2] = polar(C, C, R_TRACK - 14, a)
        const [lx, ly] = polar(C, C, R_TRACK + 16, a)
        const val = max * f
        return (
          <g key={f}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-ink-faint"
              fontSize={9.5}
              fontWeight={500}
            >
              {Math.round(val)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function NotSourcedDial({ ticker }) {
  return (
    <div className="flex w-full flex-col items-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${ticker}: no sourced figure for this metric`}
        className="text-ink-faint"
      >
        <circle cx={C} cy={C} r={R_TRACK} fill="none" stroke="currentColor" strokeWidth={7} opacity={0.18} />
        <text
          x={C}
          y={C - 6}
          textAnchor="middle"
          className="fill-ink-soft"
          fontSize={12}
          fontWeight={600}
        >
          Not sourced
        </text>
        <text x={C} y={C + 16} textAnchor="middle" className="fill-ink-faint" fontSize={10.5}>
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

function CompanyDial({ ticker, fig, scaleMax }) {
  const color = colorOf(ticker)
  const n = parseScalar(fig.value)
  const frac = scaleMax > 0 && n != null ? Math.max(0, Math.min(1, n / scaleMax)) : 0
  const needleAngle = frac * 360

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${ticker} ${fig.metricId}: ${fig.value}`}
        className="text-ink"
      >
        {/* track */}
        <circle cx={C} cy={C} r={R_TRACK} fill="none" stroke="currentColor" strokeWidth={7} opacity={0.12} />
        {/* company arc fill — animates on metric/company change */}
        <path
          d={arcPath(C, C, R_TRACK, frac)}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <TickMarks max={scaleMax} />
        {/* needle — rotates with a transition */}
        <g
          className="transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${C}px ${C}px` }}
        >
          <line x1={C} y1={C} x2={C} y2={C - R_NEEDLE} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        </g>
        <circle cx={C} cy={C} r={7} fill={color} />
        <circle cx={C} cy={C} r={7} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.25} />
        {/* center value */}
        <text
          x={C}
          y={C + 30}
          textAnchor="middle"
          className="fill-ink"
          fontSize={17}
          fontWeight={700}
        >
          {fig.value}
        </text>
        {fig.sub && (
          <text x={C} y={C + 46} textAnchor="middle" className="fill-ink-faint" fontSize={10}>
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

export default function VariantDials() {
  const [tickers, setTickers] = useState(DEFAULT_TICKERS)
  const [metricId, setMetricId] = useState(DEFAULT_METRIC)

  const def = useMemo(() => METRICS.find((m) => m.id === metricId), [metricId])

  const figs = useMemo(
    () => tickers.map((t) => resolveFigure(metricId, t)),
    [metricId, tickers],
  )
  const figByTicker = useMemo(
    () => Object.fromEntries(tickers.map((t, i) => [t, figs[i]])),
    [tickers, figs],
  )

  /* Scale logic: percentage metrics ride 0–100 directly; absolute
     metrics normalize to the strongest selected figure. */
  const withVal = figs.filter((f) => f && f.value != null)
  const isPercent =
    withVal.length > 0 &&
    withVal.every((f) => typeof f.value === 'string' && /%/.test(f.value))
  const nums = withVal
    .map((f) => parseScalar(f.value))
    .filter((n) => n != null)
    .map((n) => Math.max(0, n))
  const leaderMax = nums.length > 0 ? Math.max(...nums) : 0
  const scaleMax = isPercent ? 100 : leaderMax
  const scaleNote = isPercent ? '0–100 scale' : 'share of leader'

  const takeaway = useMemo(() => (def ? describeGap(def, figs) : ''), [def, figs])

  const toggleTicker = (t) => {
    setTickers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  return (
    <div className="rounded-card border border-line bg-surface p-md shadow-card">
      {/* header: metric picker + explanation */}
      <div className="flex flex-wrap items-center gap-sm">
        <MetricDropdown metricId={metricId} onSelect={setMetricId} tickers={tickers} />
        {def && <InfoButton def={def} figs={figs.filter(Boolean)} />}
        <span className="ml-auto rounded-pill border border-line px-sm py-2xs text-caption text-ink-faint">
          Scale: {scaleNote}
        </span>
      </div>

      {/* dials */}
      <div
        className="mt-md grid gap-md"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        {tickers.map((t) =>
          figByTicker[t] ? (
            <CompanyDial
              key={t}
              ticker={t}
              fig={figByTicker[t]}
              scaleMax={scaleMax}
            />
          ) : (
            <NotSourcedDial key={t} ticker={t} />
          ),
        )}
      </div>

      {/* takeaway */}
      <p className="mt-md border-t border-line pt-sm text-label leading-relaxed text-ink-soft">
        {takeaway}
      </p>

      {/* company selection */}
      <div className="mt-md border-t border-line pt-sm">
        <CompanyPicker tickers={tickers} onToggle={toggleTicker} max={MAX_COMPANIES} showSearch={false} />
      </div>
    </div>
  )
}
