/*
  Lab variant — "Arrow race" for the Company Comparison builder.

  Companies race as horizontal chevron arrows: each arrow is filled in the
  company color, its length proportional to the metric value (leader = full
  track), ranked top-to-bottom. When the metric changes, arrows animate
  their lengths via a CSS width transition — the "race" feel.

  Selection contract: every selected company ALWAYS renders. Companies with
  no figure for the current metric get a slim dashed "Not sourced" track
  row — never silently dropped. A coverage note ("3 of 4 with data") makes
  partial coverage transparent.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. The stage is never empty: the last company cannot
  be deselected (CompanyPicker enforces this), and the metric always falls
  back to the first available one.
*/
import { useMemo, useState } from 'react'
import {
  METRICS,
  resolveFigure,
  availableMetrics,
  describeGap,
} from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { colorOf, nameOf, MAX_COMPANIES } from '../shared/companyGroups.js'
import {
  CompanyPicker,
  MetricDropdown,
  InfoButton,
} from '../shared/LabShared.jsx'

const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const DEFAULT_METRIC = 'revenue'

/* Chevron head: fixed 14px tip, body fills the rest. */
const CHEVRON =
  'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
const MIN_PCT = 8 // shortest arrow — keeps the chevron tip visible

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

export default function VariantArrowRace() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricId, setMetricId] = useState(DEFAULT_METRIC)

  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const def = useMemo(
    () => METRICS.find((m) => m.id === metricId) ?? avail[0],
    [metricId, avail],
  )
  const mid = def ? def.id : DEFAULT_METRIC
  const desc = def?.higherIsBetter === false // lower is better

  const toggle = (t) =>
    setTickers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  /* Figures per company, in selection order. */
  const figs = useMemo(
    () => tickers.map((t) => resolveFigure(mid, t)),
    [tickers, mid],
  )

  /* Ranked racers: positive parseable numbers only. */
  const ranked = useMemo(() => {
    const scored = figs
      .map((f) => {
        if (!f || f.value == null) return null
        const n = parseScalar(f.value)
        return n == null || n <= 0 ? null : { f, n }
      })
      .filter(Boolean)
    scored.sort((a, b) => (desc ? a.n - b.n : b.n - a.n))
    return scored
  }, [figs, desc])

  /* Everyone else: missing figure, unparseable value, or non-positive. */
  const missing = useMemo(
    () => tickers.filter((t) => !ranked.some((r) => r.f.ticker === t)),
    [tickers, ranked],
  )

  const leaderN = ranked.length > 0 ? ranked[0].n : 0
  const withData = figs.filter((f) => f && f.value != null)
  const takeaway = def ? describeGap(def, withData) : ''

  return (
    <div className="rounded-card border border-line bg-surface p-md sm:p-lg">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <div className="text-eyebrow uppercase text-ink-faint">Infographic · Arrow race</div>
          <h2 className="mt-2xs text-title font-semibold text-ink">
            {def ? def.label : 'Metric'} — head to head
          </h2>
        </div>
        <div className="flex items-center gap-2xs">
          <MetricDropdown metricId={mid} onSelect={setMetricId} tickers={tickers} />
          <InfoButton def={def} figs={withData} />
        </div>
      </div>

      {/* Takeaway + coverage */}
      <p className="mt-sm text-body text-ink-soft">{takeaway}</p>
      <p className="mt-2xs text-caption text-ink-faint">
        {withData.length} of {tickers.length} with data
        {missing.length > 0 ? ` · ${missing.length} shown as not sourced` : ''}
      </p>

      {/* Stage */}
      <div className="mt-md grid gap-sm overflow-x-hidden">
        {ranked.map(({ f, n }, i) => {
          const color = colorOf(f.ticker)
          const pct =
            leaderN > 0
              ? Math.max(MIN_PCT, Math.min(100, (desc ? leaderN / n : n / leaderN) * 100))
              : MIN_PCT
          const share = Math.round((desc ? leaderN / n : n / leaderN) * 100)
          const inside = pct >= 32 // room for the label inside the arrow
          return (
            <div key={f.ticker} className="flex items-center gap-sm">
              {/* Rank + ticker badge (the "tail" end) */}
              <div className="flex w-24 shrink-0 items-center gap-2xs sm:w-28">
                <span className="w-8 shrink-0 text-eyebrow uppercase text-ink-faint">
                  {ordinal(i + 1)}
                </span>
                <span
                  className="truncate rounded-pill px-2xs py-2xs text-caption font-medium text-white"
                  style={{ background: color }}
                  title={nameOf(f.ticker)}
                >
                  {f.ticker}
                </span>
              </div>
              {/* Track */}
              <div className="relative h-12 min-w-0 flex-1">
                <div
                  className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                  style={{ width: `${pct}%`, background: color, clipPath: CHEVRON }}
                  title={`${nameOf(f.ticker)} — ${def?.label}: ${f.value} (${share}% of leader)`}
                >
                  {/* Value + share label: inside the arrow when it fits, else just past the tip */}
                  {inside ? (
                    <div className="absolute inset-y-0 right-4 flex flex-col items-end justify-center leading-tight text-white">
                      <span className="whitespace-nowrap text-label font-semibold">{f.value}</span>
                      <span className="whitespace-nowrap text-caption text-white/80">
                        {share}% of leader
                      </span>
                    </div>
                  ) : (
                    <div
                      className="absolute top-1/2 flex -translate-y-1/2 flex-col justify-center leading-tight"
                      style={{ left: 'calc(100% + 8px)' }}
                    >
                      <span className="whitespace-nowrap text-label font-semibold text-ink">
                        {f.value}
                      </span>
                      <span className="whitespace-nowrap text-caption text-ink-faint">
                        {share}% of leader
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Slim "Not sourced" / non-chartable rows */}
        {missing.map((t) => {
          const fig = figs.find((f) => f && f.ticker === t)
          return (
            <div key={t} className="flex items-center gap-sm">
              <div className="flex w-24 shrink-0 items-center gap-2xs sm:w-28">
                <span className="w-8 shrink-0 text-eyebrow uppercase text-ink-faint">—</span>
                <span
                  className="truncate rounded-pill px-2xs py-2xs text-caption font-medium text-white"
                  style={{ background: colorOf(t) }}
                  title={nameOf(t)}
                >
                  {t}
                </span>
              </div>
              <div className="flex h-12 min-w-0 flex-1 items-center rounded-control border border-dashed border-line px-sm">
                <span className="truncate text-caption text-ink-faint">
                  {fig && fig.value != null
                    ? `${fig.value} — not chartable on this scale`
                    : `Not sourced — no ${def?.label ?? 'metric'} figure`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Company selection */}
      <div className="mt-lg border-t border-line/60 pt-md">
        <CompanyPicker tickers={tickers} onToggle={toggle} max={MAX_COMPANIES} />
      </div>
    </div>
  )
}
