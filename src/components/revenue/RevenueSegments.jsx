import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { revenue, getCompany, companyColor } from '../../lib/data.js'
import SectionHeader from '../common/SectionHeader.jsx'
import CompareToggle from '../common/CompareToggle.jsx'
import Filters from '../common/Filters.jsx'
import SourceTag from '../common/SourceTag.jsx'

/*
  Section 03 — Revenue & Segments.
  Quarterly total revenue from revenue.json (US$ billions, all reported).
    - One company selected  → bar chart of its quarterly revenue.
    - Multiple selected     → line chart, one line per company (compare mode).
    - Basis toggle: Absolute ($B) or Indexed (each series = 100 at its first
      quarter) so growth rates are comparable despite very different sizes.
  Nulls (e.g. Broadcom's last two quarters, pending re-verification) are left
  as gaps, never zero-filled. Every figure's source tier is shown.
*/

const { quarters, series } = revenue
const seriesByTicker = Object.fromEntries(series.map((s) => [s.ticker, s]))

const COMPANY_OPTIONS = series.map((s) => ({
  id: s.ticker,
  label: getCompany(s.ticker)?.name ?? s.ticker,
}))

function firstNonNull(arr) {
  for (const v of arr) if (v !== null && v !== undefined) return v
  return null
}

export default function RevenueSegments({ section }) {
  const [selected, setSelected] = useState([series[0].ticker])
  const [basis, setBasis] = useState('absolute')
  const indexed = basis === 'indexed'
  const isCompare = selected.length > 1

  const data = useMemo(() => {
    return quarters.map((q, i) => {
      const row = { quarter: q }
      for (const t of selected) {
        const s = seriesByTicker[t]
        let v = s?.revenue[i] ?? null
        if (indexed && v !== null && v !== undefined) {
          const base = firstNonNull(s.revenue)
          v = base ? Number(((v / base) * 100).toFixed(1)) : null
        }
        row[t] = v
      }
      return row
    })
  }, [selected, indexed])

  const selectedSeries = selected.map((t) => seriesByTicker[t]).filter(Boolean)
  const showAvgoFlag = selectedSeries.some((s) => s.reviewFlag)

  return (
    <section>
      <SectionHeader section={section} />

      <div className="mb-lg flex flex-wrap items-center gap-md">
        <CompareToggle
          value={basis}
          onChange={setBasis}
          ariaLabel="Value basis"
          options={[
            { id: 'absolute', label: 'Absolute ($B)' },
            { id: 'indexed', label: 'Indexed (100)' },
          ]}
        />
        <Filters
          options={COMPANY_OPTIONS}
          selected={selected}
          onChange={(ids) => setSelected(ids.length ? ids : selected)}
          multi
          ariaLabel="Choose companies"
        />
      </div>

      {/* Legend with per-series source tier */}
      <div className="mb-md flex flex-wrap gap-x-lg gap-y-xs">
        {selectedSeries.map((s) => {
          const company = getCompany(s.ticker)
          return (
            <span key={s.ticker} className="inline-flex items-center gap-xs text-label">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: company?.color }}
              />
              <span className="text-ink">{company?.name ?? s.ticker}</span>
              <SourceTag tier={s.tier} showLabel={false} />
            </span>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-surface p-lg">
        <div style={{ width: '100%', minWidth: 520, height: 400 }}>
          <ResponsiveContainer>
            {isCompare ? (
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="quarter" {...X_AXIS_PROPS} />
                <YAxis {...yAxisProps(indexed)} />
                <Tooltip content={<RevenueTooltip indexed={indexed} />} cursor={{ stroke: 'var(--line)' }} />
                {selected.map((t) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={companyColor(t)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="quarter" {...X_AXIS_PROPS} />
                <YAxis {...yAxisProps(indexed)} />
                <Tooltip content={<RevenueTooltip indexed={indexed} />} cursor={{ fill: 'var(--surface-raised)' }} />
                <Bar
                  dataKey={selected[0]}
                  fill={companyColor(selected[0])}
                  isAnimationActive={false}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Single-company AI inflection caption */}
      {!isCompare && selectedSeries[0]?.aiInflection && (
        <p className="mt-md text-caption text-ink-faint">
          AI inflection — named {selectedSeries[0].aiInflection.named}, accelerated{' '}
          {selectedSeries[0].aiInflection.accelerated}: {selectedSeries[0].aiInflection.note}
        </p>
      )}

      <p className="mt-md text-caption text-ink-faint">{revenue.note}</p>
      {showAvgoFlag && (
        <p className="mt-2xs text-caption text-tier-estimated">
          Note: {selectedSeries.find((s) => s.reviewFlag).reviewFlag}
        </p>
      )}
    </section>
  )
}

// Shared axis props. These must be applied to XAxis/YAxis rendered as DIRECT
// children of the chart — Recharts discovers axes by scanning its immediate
// children by type, so they can't be wrapped in a custom component.
const X_AXIS_PROPS = {
  tick: { fontSize: 12, fill: 'var(--ink-faint)' },
  interval: 0,
  angle: -45,
  textAnchor: 'end',
  height: 54,
  tickLine: false,
  axisLine: { stroke: 'var(--line)' },
}

function yAxisProps(indexed) {
  return {
    tick: { fontSize: 12, fill: 'var(--ink-faint)' },
    tickLine: false,
    axisLine: false,
    width: 52,
    tickFormatter: (v) => (indexed ? v : `$${v}`),
  }
}

function RevenueTooltip({ active, payload, label, indexed }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-control border border-line bg-surface p-sm text-caption shadow-raised">
      <div className="mb-2xs font-medium text-ink">{label}</div>
      {payload.map((p) => {
        const company = getCompany(p.dataKey)
        return (
          <div key={p.dataKey} className="flex items-center gap-xs">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: p.color }}
            />
            <span className="text-ink-soft">{company?.name ?? p.dataKey}:</span>
            <span className="font-medium text-ink">
              {p.value === null || p.value === undefined
                ? '—'
                : indexed
                  ? p.value
                  : `$${p.value}B`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
