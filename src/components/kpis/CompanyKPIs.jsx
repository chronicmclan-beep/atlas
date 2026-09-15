import { useCallback, useMemo, useState } from 'react'
import { kpis, getCompany, kpisByTicker } from '../../lib/data.js'
import { useCompanyFocus } from '../../lib/appState.jsx'
import SectionHeader from '../common/SectionHeader.jsx'
import MetricCard from '../common/MetricCard.jsx'
import CompareToggle from '../common/CompareToggle.jsx'
import Filters from '../common/Filters.jsx'
import SourceTag from '../common/SourceTag.jsx'
import GlossaryTerm from '../common/GlossaryTerm.jsx'
import CrossLinks from '../common/CrossLinks.jsx'
import CompanyBadge from '../common/CompanyBadge.jsx'

/*
  Section 02 — Company KPIs.
  Per-company financials from kpis.json. Two views:
    - Single: one company's full metric grid (MetricCard shows each figure's
      source tier and marks committed vs realized).
    - Compare: a table aligning metrics across several companies; each cell
      carries its own source tier and committed marker.
  Metric labels are tap-to-learn via glossary.json.
*/

// Company options in the order they appear in kpis.json.
const COMPANY_OPTIONS = kpis.map((k) => ({
  id: k.ticker,
  label: getCompany(k.ticker)?.name ?? k.ticker,
}))

const kpiByTicker = Object.fromEntries(kpis.map((k) => [k.ticker, k]))

export default function CompanyKPIs({ section }) {
  const [mode, setMode] = useState('single')
  const [single, setSingle] = useState(kpis[0].ticker)
  const [compare, setCompare] = useState(kpis.slice(0, 3).map((k) => k.ticker))

  // Cross-link: when navigated here for a company, show it in single view.
  const onFocus = useCallback((ticker) => {
    if (kpisByTicker[ticker]) {
      setMode('single')
      setSingle(ticker)
    }
  }, [])
  useCompanyFocus('kpis', onFocus)

  return (
    <section>
      <SectionHeader section={section} accent={section.color} />

      <div className="mb-lg flex flex-wrap items-center gap-md">
        <CompareToggle
          value={mode}
          onChange={setMode}
          ariaLabel="KPI view"
          options={[
            { id: 'single', label: 'Single' },
            { id: 'compare', label: 'Compare' },
          ]}
        />
        {mode === 'single' ? (
          <Filters
            options={COMPANY_OPTIONS}
            selected={[single]}
            onChange={(ids) => ids.length && setSingle(ids[ids.length - 1])}
            multi={false}
            ariaLabel="Choose a company"
          />
        ) : (
          <Filters
            options={COMPANY_OPTIONS}
            selected={compare}
            onChange={setCompare}
            multi
            ariaLabel="Choose companies to compare"
          />
        )}
      </div>

      {mode === 'single' ? (
        <SingleView record={kpiByTicker[single]} />
      ) : (
        <CompareView records={compare.map((t) => kpiByTicker[t]).filter(Boolean)} accent={section.color} />
      )}
    </section>
  )
}

function CompanyMeta({ record }) {
  const company = getCompany(record.ticker)
  return (
    <div className="flex flex-wrap items-center gap-x-sm gap-y-2xs">
      <CompanyBadge name={record.ticker} size={26} />
      <span className="text-heading font-medium" style={{ color: company?.color }}>
        {company?.name ?? record.ticker}
      </span>
      <span className="text-label text-ink-soft">{record.fiscalYear}</span>
      <span className="text-caption text-ink-faint">{record.asOf}</span>
    </div>
  )
}

function SingleView({ record }) {
  if (!record) return <p className="text-body text-ink-faint">No data for this company.</p>
  return (
    <div>
      <CompanyMeta record={record} />
      <CrossLinks ticker={record.ticker} exclude="kpis" className="mt-xs" />
      <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {record.metrics.map((m, i) => (
          <MetricCard key={`${m.label}-${i}`} metric={m} />
        ))}
      </div>
      <p className="mt-lg text-caption text-ink-faint">Source: {record.source}</p>
    </div>
  )
}

function CompareView({ records, accent }) {
  // Union of metric labels, preserving first-seen order across companies.
  const rows = useMemo(() => {
    const order = []
    const seen = new Set()
    for (const r of records) {
      for (const m of r.metrics) {
        if (!seen.has(m.label)) {
          seen.add(m.label)
          order.push(m.label)
        }
      }
    }
    return order
  }, [records])

  if (records.length === 0) {
    return <p className="text-body text-ink-faint">Select one or more companies to compare.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-label">
        <thead>
          <tr
            className="border-b-2 text-left"
            style={{ borderBottomColor: accent ?? 'var(--line)' }}
          >
            <th className="py-sm pr-md font-medium text-ink-faint">Metric</th>
            {records.map((r) => {
              const company = getCompany(r.ticker)
              return (
                <th key={r.ticker} className="px-md py-sm font-medium">
                  <span className="flex items-center gap-xs">
                    <CompanyBadge name={r.ticker} size={18} />
                    <span style={{ color: company?.color }}>{company?.name ?? r.ticker}</span>
                    <span className="text-caption font-normal text-ink-faint">{r.fiscalYear}</span>
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((label) => (
            <tr key={label} className="border-b border-line/60 align-top">
              <th scope="row" className="py-sm pr-md text-left font-normal text-ink-soft">
                <GlossaryTerm term={label}>{label}</GlossaryTerm>
              </th>
              {records.map((r) => {
                const m = r.metrics.find((x) => x.label === label)
                return <CompareCell key={r.ticker} metric={m} />
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompareCell({ metric }) {
  if (!metric) {
    return <td className="px-md py-sm text-ink-faint">—</td>
  }
  const isCommitted = metric.realized === false
  const hasValue = metric.value !== null && metric.value !== undefined
  return (
    <td className="px-md py-sm">
      <div className="flex items-center gap-xs">
        <span
          className={
            (hasValue ? (metric.negative ? 'text-tier-estimated' : 'text-ink') : 'text-ink-faint') +
            (isCommitted ? ' border-b border-dashed border-ink-faint' : '')
          }
          title={isCommitted ? 'Committed — announced, not yet realized' : undefined}
        >
          {hasValue ? metric.value : '—'}
        </span>
        <SourceTag tier={metric.tier} showLabel={false} />
      </div>
      {metric.sub && <div className="mt-2xs text-caption text-ink-faint">{metric.sub}</div>}
    </td>
  )
}
