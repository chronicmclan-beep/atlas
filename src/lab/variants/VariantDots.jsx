import { useEffect, useMemo, useState } from 'react'
import {
  METRICS,
  coverage,
  resolveFigure,
  describeGap,
} from '../../lib/compareMetrics.js'
import {
  CompanyPicker,
  MetricDropdown,
  InfoButton,
  parseScalar,
  colorOf,
  nameOf,
  MAX_COMPANIES,
} from '../shared/LabShared.jsx'

/*
  Lab variant — "Dot pictograms".

  Infographic dot-grid treatment: each company is a row — ticker + name,
  a field of dots in the company color, then the value. One dot equals a
  labeled unit ("● = $10B"), auto-scaled from 1/2/5 × 10^n so the largest
  value renders as 10–40 dots. Dots stagger in on change.

  Honesty rules: values under one unit render a single outlined dot plus a
  "< 1 unit" note — never zero-filled silently. Companies with no figure
  for the metric render "Not sourced" instead of dots, and always render.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. No banned vocabulary in any string.
*/

const DEFAULT_TICKERS = ['NVDA', 'AMD']
const DEFAULT_METRIC = 'revenue'
const STAGGER_MS = 24 // per-dot transition delay; ~40 dots ≈ 1s total

/** Pick the largest 1/2/5 × 10^n unit so the biggest value lands at 10–40 dots. */
function pickUnit(maxVal) {
  if (!(maxVal > 0)) return { unit: 1, money: false }
  const kMax = Math.floor(Math.log10(maxVal)) + 1
  for (let k = kMax; k >= kMax - 8; k--) {
    for (const c of [5, 2, 1]) {
      const unit = c * Math.pow(10, k)
      if (maxVal / unit >= 10) return { unit }
    }
  }
  return { unit: 1 }
}

function moneyOf(value) {
  return typeof value === 'string' && value.includes('$')
}

function formatUnit(unit, money) {
  const mag = unit >= 1e12 ? [1e12, 'T'] : unit >= 1e9 ? [1e9, 'B'] : unit >= 1e6 ? [1e6, 'M'] : unit >= 1e3 ? [1e3, 'K'] : [1, '']
  const n = unit / mag[0]
  const num = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
  return (money ? '$' : '') + num + mag[1]
}

function DotField({ color, count, animated, unitLabel, value }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    return () => cancelAnimationFrame(raf)
  }, [animated])

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-[5px] py-2xs"
      role="img"
      aria-label={`${count} dots at ${unitLabel} each, totaling ${value}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            'h-2.5 w-2.5 rounded-full transition-all duration-300 ease-out ' +
            (mounted ? 'scale-100 opacity-100' : 'scale-0 opacity-0')
          }
          style={{ background: color, transitionDelay: `${i * STAGGER_MS}ms` }}
        />
      ))}
    </div>
  )
}

export default function VariantDots() {
  const [tickers, setTickers] = useState(DEFAULT_TICKERS)
  const [metricId, setMetricId] = useState(DEFAULT_METRIC)

  const toggle = (t) => {
    setTickers((prev) => {
      if (prev.includes(t)) return prev.length === 1 ? prev : prev.filter((x) => x !== t)
      return prev.length >= MAX_COMPANIES ? prev : [...prev, t]
    })
  }

  const def = METRICS.find((m) => m.id === metricId)
  const figs = useMemo(
    () => tickers.map((t) => resolveFigure(metricId, t)),
    [tickers, metricId],
  )

  const { unit, money } = useMemo(() => {
    const nums = figs.map((f) => parseScalar(f?.value)).filter((n) => n != null && n > 0)
    const picked = pickUnit(nums.length ? Math.max(...nums) : 0)
    const isMoney = figs.some((f) => f && moneyOf(f.value))
    return { unit: picked.unit, money: isMoney }
  }, [figs])

  const unitLabel = `● = ${formatUnit(unit, money)}`
  const cov = coverage(metricId, tickers)

  const rows = tickers.map((t, i) => {
    const fig = figs[i]
    const num = parseScalar(fig?.value)
    if (!fig || num == null) return { ticker: t, state: 'missing' }
    if (num <= 0) return { ticker: t, state: 'zero', fig }
    const count = Math.round(num / unit)
    if (count < 1) return { ticker: t, state: 'subunit', fig }
    return { ticker: t, state: 'dots', fig, count: Math.min(count, 200) }
  })

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-sm">
        <MetricDropdown metricId={metricId} onSelect={setMetricId} tickers={tickers} />
        {def && <InfoButton def={def} figs={figs} />}
        <span className="text-caption text-ink-faint">
          {cov} of {tickers.length} with data
        </span>
      </div>

      <div className="mt-xs">
        <CompanyPicker tickers={tickers} onToggle={toggle} showSearch={false} />
      </div>

      {/* Unit legend — always labeled next to the grid */}
      <div className="mt-md flex items-center gap-xs">
        <span className="text-eyebrow uppercase text-ink-faint">Dot value</span>
        <span className="rounded-pill border border-line bg-surface px-sm py-2xs text-label font-medium text-ink">
          {unitLabel}
        </span>
      </div>

      {/* Company rows */}
      <div className="mt-sm divide-y divide-line/60 rounded-card border border-line bg-surface">
        {rows.map((row) => {
          const color = colorOf(row.ticker)
          return (
            <div key={row.ticker + metricId} className="group px-md py-sm transition-colors hover:bg-surface-hover/50">
              <div className="flex flex-col gap-2xs sm:flex-row sm:items-center sm:gap-md">
                {/* Identity */}
                <div className="flex shrink-0 items-center gap-2xs sm:w-44">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <span className="text-label font-medium text-ink">{row.ticker}</span>
                  <span className="truncate text-caption text-ink-soft">{nameOf(row.ticker)}</span>
                </div>

                {/* Dots or honest fallback */}
                {row.state === 'dots' && (
                  <DotField
                    color={color}
                    count={row.count}
                    animated={row.ticker + metricId}
                    unitLabel={unitLabel}
                    value={row.fig.value}
                  />
                )}
                {row.state === 'subunit' && (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-xs py-2xs">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full border-2"
                      style={{ borderColor: color }}
                    />
                    <span className="text-caption text-ink-faint">&lt; 1 unit — too small to fill a dot</span>
                  </div>
                )}
                {row.state === 'zero' && (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-xs py-2xs">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full border-2"
                      style={{ borderColor: color }}
                    />
                    <span className="text-caption text-ink-faint">Zero or negative — not drawable as dots</span>
                  </div>
                )}
                {row.state === 'missing' && (
                  <div className="flex min-w-0 flex-1 items-center py-2xs">
                    <span className="rounded-pill border border-dashed border-line px-sm py-2xs text-caption text-ink-faint">
                      Not sourced
                    </span>
                  </div>
                )}

                {/* Value */}
                <div className="shrink-0 text-body font-medium text-ink sm:w-32 sm:text-right">
                  {row.fig ? row.fig.value : '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Takeaway */}
      {def && (
        <p className="mt-md text-body leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">What this shows: </span>
          {describeGap(def, figs)}
        </p>
      )}
    </div>
  )
}
