/*
  Variant: "Venn overlap" — Lab experiment.

  Companies as overlapping circles with AREA proportional to the metric
  value (radius ∝ sqrt(value), largest normalized to fit the stage).
  Circles render in company colors at ~55% opacity so overlaps blend.
  The overlap region is labeled with the multiple between the two largest
  companies. Companies with no data render as outlined empty circles
  labeled "Not sourced" — never silently dropped.

  Figures resolve ONLY through src/lib/compareMetrics.js (resolveFigure).
*/
import { useMemo, useState } from 'react'
import { METRICS, resolveFigure, describeGap } from '../../lib/compareMetrics.js'
import {
  CompanyPicker,
  MetricDropdown,
  InfoButton,
  parseScalar,
  colorOf,
} from '../shared/LabShared.jsx'

const W = 640
const H = 500
const CX = W / 2
const CY = H / 2 - 30
const R_MAX = 140
const R_EMPTY = 48 // radius for "Not sourced" outlined circles
const R_MIN = 16 // floor so a sourced company is always visible

function fmtMultiple(mx, mn) {
  const r = mx / mn
  return r >= 10 ? `${Math.round(r)}×` : `${r.toFixed(1)}×`
}

/* Layout: 2 → side by side; 3 → triangle. Returns per-ticker {x, y, r}. */
function layoutCircles(radii) {
  const n = radii.length
  if (n === 1) return [{ x: CX, y: CY, r: radii[0] }]
  if (n === 2) {
    const d = 0.62 * (radii[0] + radii[1])
    return [
      { x: CX - d / 2, y: CY, r: radii[0] },
      { x: CX + d / 2, y: CY, r: radii[1] },
    ]
  }
  // Triangle: use the mean pairwise distance so the ring reads as a venn.
  const d =
    (0.62 * (radii[0] + radii[1]) +
      0.62 * (radii[1] + radii[2]) +
      0.62 * (radii[0] + radii[2])) /
    3
  const h = (d * Math.sqrt(3)) / 2
  return [
    { x: CX, y: CY - h / 2, r: radii[0] },
    { x: CX - d / 2, y: CY + h / 2, r: radii[1] },
    { x: CX + d / 2, y: CY + h / 2, r: radii[2] },
  ]
}

export default function VariantVenn() {
  const [tickers, setTickers] = useState(['NVDA', 'AMD'])
  const [metricId, setMetricId] = useState('revenue')

  const toggle = (t) =>
    setTickers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const def = METRICS.find((m) => m.id === metricId)

  const items = useMemo(
    () =>
      tickers.map((ticker) => {
        const fig = resolveFigure(metricId, ticker)
        const num = fig ? parseScalar(fig.value) : null
        return { ticker, fig, num }
      }),
    [tickers, metricId],
  )

  const figs = useMemo(() => items.filter((i) => i.fig).map((i) => i.fig), [items])

  const circles = useMemo(() => {
    const positives = items.map((i) => (i.num != null && i.num > 0 ? i.num : 0))
    const vmax = Math.max(...positives, 0)
    const radii = items.map((i) =>
      i.fig == null
        ? R_EMPTY
        : vmax > 0
          ? Math.max(R_MIN, R_MAX * Math.sqrt(Math.max(i.num, 0) / vmax))
          : R_MAX * 0.5,
    )
    return layoutCircles(radii).map((c, idx) => ({ ...c, ...items[idx] }))
  }, [items])

  /* Pairwise "X leads by N×" labels for the overlap regions. */
  const overlapLabels = useMemo(() => {
    const labels = []
    for (let a = 0; a < circles.length; a++) {
      for (let b = a + 1; b < circles.length; b++) {
        const A = circles[a]
        const B = circles[b]
        if (A.num == null || B.num == null || A.num <= 0 || B.num <= 0) continue
        const lead = A.num >= B.num ? A : B
        const tail = A.num >= B.num ? B : A
        labels.push({
          key: `${A.ticker}-${B.ticker}`,
          x: (A.x + B.x) / 2,
          y: (A.y + B.y) / 2,
          text: `${lead.ticker} leads by ${fmtMultiple(lead.num, tail.num)}`,
          lead,
        })
      }
    }
    return labels
  }, [circles])

  const takeaway = def ? describeGap(def, figs) : ''

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-sm">
        <MetricDropdown metricId={metricId} onSelect={setMetricId} tickers={tickers} />
        <InfoButton def={def} figs={figs} />
      </div>

      {/* Stage */}
      <div className="mt-md overflow-hidden rounded-card border border-line bg-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Venn comparison of ${tickers.join(', ')} by ${def ? def.label : metricId}`}
        >
          {/* Circles */}
          {circles.map((c) => {
            const color = colorOf(c.ticker)
            const empty = c.fig == null
            return (
              <g key={c.ticker}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.r}
                  fill={empty ? 'none' : color}
                  fillOpacity={empty ? 0 : 0.55}
                  stroke={empty ? 'currentColor' : color}
                  strokeWidth={empty ? 2 : 1.5}
                  strokeDasharray={empty ? '6 5' : undefined}
                  className="text-ink-faint"
                  style={{
                    transition:
                      'cx 0.6s ease, cy 0.6s ease, r 0.6s ease, fill 0.6s ease',
                  }}
                />
                {/* Ticker + value label below the circle */}
                <text
                  x={c.x}
                  y={c.y + c.r + 22}
                  textAnchor="middle"
                  className="fill-ink"
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {c.ticker}
                </text>
                <text
                  x={c.x}
                  y={c.y + c.r + 40}
                  textAnchor="middle"
                  className="fill-ink-soft"
                  style={{ fontSize: 13 }}
                >
                  {empty ? 'Not sourced' : c.fig.value}
                </text>
              </g>
            )
          })}

          {/* Overlap multiple labels: pill offset above the overlap point, leader line down */}
          {overlapLabels.map((L) => {
            const w = L.text.length * 6.4 + 20
            const pillY = L.y - 46 // pill top edge
            return (
              <g key={L.key}>
                <line
                  x1={L.x}
                  y1={pillY + 24}
                  x2={L.x}
                  y2={L.y - 5}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  className="stroke-ink-faint"
                  opacity={0.7}
                />
                <rect
                  x={L.x - w / 2}
                  y={pillY}
                  width={w}
                  height={24}
                  rx={12}
                  className="fill-surface stroke-line"
                  strokeWidth={1}
                />
                <text
                  x={L.x}
                  y={pillY + 16.5}
                  textAnchor="middle"
                  className="fill-ink"
                  style={{ fontSize: 12.5, fontWeight: 600 }}
                >
                  {L.text}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Takeaway */}
      <p className="mt-sm text-body text-ink-soft">{takeaway}</p>
      <p className="mt-2xs text-caption text-ink-faint">
        Circle area is proportional to {def ? def.label.toLowerCase() : 'the metric'}; the largest
        company always fills the stage.
      </p>

      {/* Picker */}
      <div className="mt-lg">
        <CompanyPicker tickers={tickers} onToggle={toggle} max={3} showSearch={false} />
      </div>
    </div>
  )
}
