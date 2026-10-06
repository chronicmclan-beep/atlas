import { useState } from 'react'
import { comparison, revenue, getCompany } from '../../lib/data.js'
import { parseScalar, parseRange, parseShare } from '../../lib/compareVisual.js'
import SectionHeader from '../common/SectionHeader.jsx'
import SourceTag from '../common/SourceTag.jsx'
import CompanyBadge from '../common/CompanyBadge.jsx'
import CompareIcon from '../common/icons/CompareIcon.jsx'

/*
  Section 08 — Head-to-head (visual-first redesign).
  Default view is glanceable: bar pairs, dot scales and diverging bars carry
  the comparison; every word beyond the one-line reading sits behind a tap.
  Figures come from comparison.json — nothing is hardcoded, nothing re-gathered.
  Trend chart reuses the repo's own reported quarterly revenue series.
  Interactivity: hover-highlight on rows/bars, tap-to-inspect everywhere.
  This section explains figures; it does not advise on securities.
*/

const NVDA = 'NVDA'
const AMD = 'AMD'
const DOT_FAMILIES = new Set(['valuation'])
const DIVERGE_FAMILIES = new Set(['profitability'])
const CHIP_METRICS = new Set(['52-week range position'])

function findMetric(label) {
  for (const f of comparison.families) {
    const m = f.metrics.find((m) => m.label === label)
    if (m) return m
  }
  return null
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

function ExplainPanel({ explain }) {
  const layers = [
    ['What it is', explain.what],
    ['Why it matters', explain.why],
    ['What good looks like', explain.good],
    ['What this result means', explain.means],
  ]
  return (
    <div className="grid gap-sm border-t border-line/60 px-sm py-sm md:grid-cols-2">
      {layers.map(([title, body]) => (
        <div key={title}>
          <div className="text-eyebrow uppercase text-ink-faint">{title}</div>
          <p className="mt-2xs text-label text-ink-soft">{body}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Metric row visuals                                                   */
/* ------------------------------------------------------------------ */

function BarPair({ metric, nv, am, colors }) {
  const max = Math.max(Math.abs(nv), Math.abs(am), 1e-9)
  const lanes = [
    { tag: 'NVDA', v: nv, fig: metric.nvda, color: colors.nvda, stronger: metric.stronger === NVDA },
    { tag: 'AMD', v: am, fig: metric.amd, color: colors.amd, stronger: metric.stronger === AMD },
  ]
  return (
    <div className="mt-xs grid gap-2xs" role="img" aria-label={`${metric.label}: NVDA ${metric.nvda.value}, AMD ${metric.amd.value}`}>
      {lanes.map((l) => (
        <div key={l.tag} className="flex items-center gap-xs">
          <span className="w-9 shrink-0 text-caption font-medium" style={{ color: l.color }}>
            {l.tag}
          </span>
          <div className="h-3 min-w-6 flex-1 overflow-hidden rounded-pill bg-surface-raised">
            <div
              className="h-full rounded-pill transition-all duration-500"
              style={{ width: `${Math.max(2, (Math.abs(l.v) / max) * 100)}%`, background: l.color }}
            />
          </div>
          <span className="max-w-[44%] shrink-0 text-right text-caption leading-tight text-ink">
            {l.fig.value}
            {l.stronger && <span className="ml-2xs" aria-label="Stronger value">▲</span>}
          </span>
          <SourceTag tier={l.fig.tier} showLabel={false} />
        </div>
      ))}
    </div>
  )
}

function DivergeBars({ metric, nv, am, colors }) {
  const max = Math.max(Math.abs(nv), Math.abs(am), 1e-9)
  const half = (v) => `${Math.max(2, (Math.abs(v) / max) * 100)}%`
  return (
    <div className="mt-xs" role="img" aria-label={`${metric.label}: NVDA ${metric.nvda.value}, AMD ${metric.amd.value}`}>
      <div className="flex items-center">
        <span className="w-28 shrink-0 pr-xs text-right text-caption leading-tight text-ink">
          <span className="font-medium" style={{ color: colors.amd }}>AMD</span> {metric.amd.value}
          {metric.stronger === AMD && <span className="ml-2xs" aria-label="Stronger value">▲</span>}
        </span>
        <div className="flex h-7 flex-1 items-center justify-end">
          <div className="h-3.5 rounded-l-pill transition-all duration-500" style={{ width: half(am), background: colors.amd }} />
        </div>
        <div className="w-px shrink-0 self-stretch bg-ink-faint/50" aria-hidden="true" />
        <div className="flex h-7 flex-1 items-center">
          <div className="h-3.5 rounded-r-pill transition-all duration-500" style={{ width: half(nv), background: colors.nvda }} />
        </div>
        <span className="w-28 shrink-0 pl-xs text-caption leading-tight text-ink">
          <span className="font-medium" style={{ color: colors.nvda }}>NVDA</span> {metric.nvda.value}
          {metric.stronger === NVDA && <span className="ml-2xs" aria-label="Stronger value">▲</span>}
        </span>
      </div>
      <div className="mt-2xs flex items-center justify-between text-caption text-ink-faint">
        <SourceTag tier={metric.amd.tier} showLabel={false} />
        <SourceTag tier={metric.nvda.tier} showLabel={false} />
      </div>
    </div>
  )
}

function DotScale({ metric, nv, am, colors }) {
  const max = Math.max(nv, am) * 1.12
  const x = (v) => (v / max) * 100
  const dots = [
    { v: nv, color: colors.nvda, label: `NVDA ${metric.nvda.value.split(' ')[0]}`, tier: metric.nvda.tier, above: true, stronger: metric.stronger === NVDA },
    { v: am, color: colors.amd, label: `AMD ${metric.amd.value.split(' ')[0]}`, tier: metric.amd.tier, above: false, stronger: metric.stronger === AMD },
  ]
  return (
    <div className="mt-xs px-2xs" role="img" aria-label={`${metric.label}: NVDA ${metric.nvda.value}, AMD ${metric.amd.value}`}>
      <div className="relative h-14">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-surface-raised" />
        {dots.map((d) => (
          <div key={d.label} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${x(d.v)}%` }}>
            <div
              className="h-3.5 w-3.5 -translate-x-1/2 rounded-full ring-2 ring-bg transition-transform hover:scale-125"
              style={{ background: d.color }}
              title={d.label}
            />
            <div
              className={
                'absolute w-28 -translate-x-1/2 whitespace-normal text-center text-caption leading-tight text-ink ' +
                (d.above ? 'bottom-5' : 'top-5')
              }
            >
              {d.label}
              {d.stronger && <span className="ml-2xs" aria-label="Stronger value">▲</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2xs flex items-center justify-between text-caption text-ink-faint">
        <span>0</span>
        <span className="flex items-center gap-xs">
          <SourceTag tier={metric.nvda.tier} showLabel={false} />
          <SourceTag tier={metric.amd.tier} showLabel={false} />
        </span>
      </div>
    </div>
  )
}

function ChipPair({ metric, colors }) {
  return (
    <div className="mt-xs flex flex-wrap gap-xs">
      {[
        { tag: 'NVDA', fig: metric.nvda, color: colors.nvda, stronger: metric.stronger === NVDA },
        { tag: 'AMD', fig: metric.amd, color: colors.amd, stronger: metric.stronger === AMD },
      ].map((c) => (
        <span
          key={c.tag}
          className="inline-flex items-center gap-xs rounded-pill border border-line bg-surface-raised px-sm py-2xs text-caption text-ink"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
          <span className="font-medium">{c.tag}</span> {c.fig.value}
          {c.stronger && <span aria-label="Stronger value">▲</span>}
          <SourceTag tier={c.fig.tier} showLabel={false} />
        </span>
      ))}
    </div>
  )
}

function MetricRow({ metric, familyId, colors }) {
  const [open, setOpen] = useState(false)
  const nv = parseScalar(metric.nvda?.value)
  const am = parseScalar(metric.amd?.value)
  const hasAny = metric.nvda?.value != null || metric.amd?.value != null

  let visual
  if (!hasAny) {
    visual = (
      <div className="mt-xs flex items-center gap-xs text-caption text-ink-faint">
        Not yet sourced <SourceTag tier="unsourced" showLabel={false} />
      </div>
    )
  } else if (CHIP_METRICS.has(metric.label) || nv == null || am == null) {
    visual = <ChipPair metric={metric} colors={colors} />
  } else if (DOT_FAMILIES.has(familyId)) {
    visual = <DotScale metric={metric} nv={nv} am={am} colors={colors} />
  } else if (DIVERGE_FAMILIES.has(familyId)) {
    visual = <DivergeBars metric={metric} nv={nv} am={am} colors={colors} />
  } else {
    visual = <BarPair metric={metric} nv={nv} am={am} colors={colors} />
  }

  return (
    <div className="border-b border-line/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full px-sm py-sm text-left transition-colors hover:bg-surface-hover"
      >
        <span className="flex items-center justify-between gap-sm">
          <span className="text-label font-medium text-ink">{metric.label}</span>
          <Chevron open={open} />
        </span>
        {visual}
        <span className="mt-xs block text-caption leading-snug text-ink-soft">{metric.reading}</span>
      </button>
      {open && <ExplainPanel explain={metric.explain} />}
    </div>
  )
}

function FamilySection({ family, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-md px-md py-sm text-left transition-colors hover:bg-surface-hover"
      >
        <span className="text-heading font-medium text-ink">{family.label}</span>
        <span className="flex items-center gap-sm">
          <span className="text-caption text-ink-faint">{family.metrics.length} metrics</span>
          <Chevron open={open} className="text-body" />
        </span>
      </button>
      {open && (
        <div>
          {family.metrics.map((m) => (
            <MetricRow key={m.label} metric={m} familyId={family.id} colors={FAMILY_COLORS} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Takeaway callouts — big numbers, minimal words                        */
/* ------------------------------------------------------------------ */

const FAMILY_COLORS = { nvda: '#76B900', amd: '#ED1C24' }

function TakeawayCallouts() {
  const netMargin = findMetric('Net margin')
  const pe = findMetric('P/E ratio (trailing)')
  const gap = Math.round(parseScalar(netMargin?.nvda?.value) - parseScalar(netMargin?.amd?.value))
  const peNv = Math.round(parseScalar(pe?.nvda?.value))
  const peAm = Math.round(parseScalar(pe?.amd?.value))
  const conc = Math.round(parseShare(comparison.segments.nvda.segments[0].share))
  const cards = [
    { figure: `${gap}pt`, sub: `net-margin gap — NVDA ${netMargin.nvda.value.split(' ')[0]} vs AMD ${netMargin.amd.value.split(' ')[0]}` },
    { figure: `${peAm}x · ${peNv}x`, sub: 'trailing P/E — yet AMD richer on price-to-sales' },
    { figure: `≈${conc}%`, sub: 'of NVDA revenue from one segment; AMD is balanced' },
  ]
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
/* Revenue trend — honest sparkline from the repo's reported series      */
/* ------------------------------------------------------------------ */

function RevenueTrend() {
  const q = revenue.quarters
  const byTicker = Object.fromEntries(revenue.series.map((s) => [s.ticker, s.revenue]))
  const nv = byTicker[NVDA]
  const am = byTicker[AMD]
  if (!nv || !am) return null
  const W = 640
  const H = 190
  const L = 40
  const R = 8
  const T = 12
  const B = 24
  const YMAX = 100
  const n = Math.min(nv.length, am.length, q.length)
  const X = (i) => L + (i / (n - 1)) * (W - L - R)
  const Y = (v) => T + (1 - v / YMAX) * (H - T - B)
  const path = (vals) =>
    vals
      .slice(0, n)
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
      .join(' ')
  const lastNv = nv[n - 1]
  const lastAm = am[n - 1]
  return (
    <figure className="mt-xl rounded-card border border-line bg-surface p-md shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-xs">
        <figcaption className="text-heading font-medium text-ink">
          Quarterly revenue — last {n} quarters
        </figcaption>
        <div className="flex items-center gap-md text-caption text-ink-soft">
          <span className="flex items-center gap-2xs">
            <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS.nvda }} /> NVDA
          </span>
          <span className="flex items-center gap-2xs">
            <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS.amd }} /> AMD
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-sm w-full" role="img" aria-label={`Quarterly revenue trend: NVDA ends at $${lastNv}B, AMD at $${lastAm}B`}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={Y(g)} y2={Y(g)} className="stroke-line" strokeWidth="1" opacity="0.7" />
            <text x={L - 6} y={Y(g) + 4} textAnchor="end" className="fill-ink-faint" fontSize="11">
              ${g}B
            </text>
          </g>
        ))}
        {[0, Math.floor(n / 2)].map((i) => (
          <text key={i} x={X(i)} y={H - 6} textAnchor="middle" className="fill-ink-faint" fontSize="11">
            {q[i]}
          </text>
        ))}
        <text x={W - R} y={H - 6} textAnchor="end" className="fill-ink-faint" fontSize="11">
          {q[n - 1]}
        </text>
        <path d={path(am)} fill="none" stroke={FAMILY_COLORS.amd} strokeWidth="2.5" strokeLinejoin="round" />
        <path d={path(nv)} fill="none" stroke={FAMILY_COLORS.nvda} strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx={X(n - 1)} cy={Y(lastNv)} r="4" fill={FAMILY_COLORS.nvda} stroke="var(--bg)" strokeWidth="1.5" />
        <circle cx={X(n - 1)} cy={Y(lastAm)} r="4" fill={FAMILY_COLORS.amd} stroke="var(--bg)" strokeWidth="1.5" />
        <text x={X(n - 1) - 8} y={Y(lastNv) - 8} textAnchor="end" fontSize="12" fontWeight="600" fill={FAMILY_COLORS.nvda}>
          ${lastNv}B
        </text>
        <text x={X(n - 1) - 8} y={Y(lastAm) + 16} textAnchor="end" fontSize="12" fontWeight="600" fill={FAMILY_COLORS.amd}>
          ${lastAm}B
        </text>
      </svg>
      <p className="mt-xs text-caption text-ink-faint">
        Reported quarterly revenue, US$ billions · NVDA fiscal quarters vs AMD calendar quarters — not strictly aligned.
      </p>
    </figure>
  )
}

/* ------------------------------------------------------------------ */
/* Segments — bold stacked bars, tap to inspect                          */
/* ------------------------------------------------------------------ */

function SegmentStack({ side }) {
  const [sel, setSel] = useState(null)
  const data = comparison.segments[side]
  const ticker = side === 'nvda' ? NVDA : AMD
  const company = getCompany(ticker)
  const color = side === 'nvda' ? FAMILY_COLORS.nvda : FAMILY_COLORS.amd
  return (
    <div className="rounded-card border border-line bg-surface p-md shadow-card">
      <div className="flex items-center gap-xs">
        <CompanyBadge name={ticker} size={22} />
        <span className="text-heading font-medium" style={{ color: company?.color }}>
          {company?.name ?? ticker}
        </span>
      </div>
      <div className="mt-2xs text-caption text-ink-faint">{data.period}</div>
      <div className="mt-sm flex gap-2xs" role="group" aria-label={`${ticker} revenue segments`}>
        {data.segments.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setSel(sel === i ? null : i)}
            aria-pressed={sel === i}
            title={`${s.name}: ${s.revenue} (${s.share}) — tap to inspect`}
            className="h-10 rounded-control transition-all hover:brightness-110"
            style={{
              width: `${parseShare(s.share)}%`,
              background: color,
              outline: sel === i ? '2px solid var(--ink)' : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>
      <div className="mt-xs grid gap-2xs">
        {data.segments.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setSel(sel === i ? null : i)}
            className="flex items-center justify-between gap-sm rounded-control px-xs py-2xs text-left transition-colors hover:bg-surface-hover"
          >
            <span className="flex items-center gap-xs text-label text-ink">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
              {s.name}
            </span>
            <span className="shrink-0 text-label font-medium text-ink-soft">
              {s.revenue} · {s.share}
            </span>
          </button>
        ))}
      </div>
      {sel != null && <p className="mt-sm text-caption leading-snug text-ink-soft">{data.segments[sel].reading}</p>}
      <div className="mt-xs flex items-center gap-xs">
        <SourceTag tier={data.tier} showLabel={false} />
        <span className="text-caption text-ink-faint">{data.source}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Products / customers / pricing                                        */
/* ------------------------------------------------------------------ */

function ProductsCustomersPricing() {
  const [tab, setTab] = useState('products')
  const [openIdx, setOpenIdx] = useState(null)
  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
    { id: 'pricing', label: 'Pricing' },
  ]
  const toggle = (i) => setOpenIdx(openIdx === i ? null : i)

  return (
    <div className="rounded-card border border-line bg-surface p-md shadow-card">
      <div className="flex gap-2xs" role="tablist" aria-label="Products, customers and pricing">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setOpenIdx(null)
            }}
            className={
              'rounded-control px-sm py-xs text-label transition-colors ' +
              (tab === t.id
                ? 'bg-surface-raised font-medium text-ink'
                : 'text-ink-soft hover:bg-surface-hover hover:text-ink')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <ul className="mt-md grid gap-2xs md:grid-cols-2">
          {comparison.products.map((p, i) => (
            <li key={`${p.company}-${i}`} className="rounded-control border border-line/60 transition-colors hover:bg-surface-hover">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={openIdx === i}
                className="flex w-full items-center gap-xs px-sm py-xs text-left"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.company === 'NVIDIA' ? FAMILY_COLORS.nvda : FAMILY_COLORS.amd }}
                />
                <span className="flex-1 text-label font-medium text-ink">{p.line}</span>
                <SourceTag tier={p.tier} showLabel={false} />
                <Chevron open={openIdx === i} />
              </button>
              {openIdx === i && <p className="px-sm pb-sm text-caption leading-snug text-ink-soft">{p.desc}</p>}
            </li>
          ))}
        </ul>
      )}

      {tab === 'customers' && (
        <ul className="mt-md grid gap-2xs">
          {comparison.customers.map((c, i) => (
            <li key={i} className="rounded-control border border-line/60 transition-colors hover:bg-surface-hover">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={openIdx === i}
                className="flex w-full items-center gap-xs px-sm py-xs text-left"
              >
                <span className="flex-1 text-label font-medium text-ink">{c.customer}</span>
                <SourceTag tier={c.tier} />
                <Chevron open={openIdx === i} />
              </button>
              {openIdx === i && (
                <p className="px-sm pb-sm text-caption leading-snug text-ink-soft">
                  Buys from {c.buysFrom} — {c.evidence}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === 'pricing' && <PricingScale />}
    </div>
  )
}

const PRICE_DOMAIN = [200, 5e6]
const priceX = (v) =>
  ((Math.log10(v) - Math.log10(PRICE_DOMAIN[0])) / (Math.log10(PRICE_DOMAIN[1]) - Math.log10(PRICE_DOMAIN[0]))) * 100

function PricingScale() {
  const rows = comparison.pricing
    .map((p) => ({ ...p, range: parseRange(p.price) }))
  const ticks = [
    [250, '$250'],
    [1e3, '$1K'],
    [1e4, '$10K'],
    [1e5, '$100K'],
    [1e6, '$1M'],
  ]
  return (
    <div className="mt-md">
      <p className="text-caption text-ink-faint">
        Neither company publishes official per-unit data-center prices. Estimates are press
        reporting — never presented as official figures.
      </p>
      <div className="relative mt-sm hidden h-5 sm:block" aria-hidden="true">
        {ticks.map(([v, label]) => (
          <span key={label} className="absolute -translate-x-1/2 text-caption text-ink-faint" style={{ left: `${priceX(v)}%` }}>
            {label}
          </span>
        ))}
      </div>
      <ul className="mt-xs grid gap-xs">
        {rows.map((p, i) => (
          <li
            key={i}
            className="flex items-center gap-sm rounded-control border border-line/60 px-sm py-xs transition-colors hover:bg-surface-hover"
            title={p.source ?? p.price ?? 'Not disclosed'}
          >
            <span className="w-32 shrink-0 truncate text-caption font-medium text-ink" title={p.product}>
              {p.product}
            </span>
            {p.range ? (
              <span className="relative block h-6 min-w-10 flex-1" role="img" aria-label={`${p.product}: ${p.price}`}>
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" aria-hidden="true" />
                <span
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-pill"
                  style={{
                    left: `${priceX(p.range[0])}%`,
                    width: `${Math.max(1.5, priceX(p.range[1]) - priceX(p.range[0]))}%`,
                    background: p.tier === 'estimated' ? 'var(--ink-faint)' : 'var(--ink)',
                    opacity: p.tier === 'estimated' ? 0.55 : 0.9,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg"
                  style={{
                    left: `${priceX((p.range[0] + p.range[1]) / 2)}%`,
                    background: p.tier === 'estimated' ? 'var(--ink-faint)' : 'var(--ink)',
                  }}
                  aria-hidden="true"
                />
              </span>
            ) : (
              <span className="min-w-10 flex-1 text-caption italic text-ink-faint">Not disclosed</span>
            )}
            <span className="w-24 shrink-0 text-right text-caption text-ink-soft">{p.price ?? '—'}</span>
            <SourceTag tier={p.tier} showLabel={false} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function Compare({ section }) {
  const nvda = getCompany(NVDA)
  const amd = getCompany(AMD)
  return (
    <section>
      <SectionHeader section={section} accent={section.color} icon={CompareIcon}>
        <p className="mt-sm text-caption text-ink-faint">
          {comparison.asOf} · {comparison.policy}
        </p>
      </SectionHeader>

      {/* Sticky company header — stays visible while scrolling */}
      <div className="sticky top-0 z-10 -mx-sm border-b border-line bg-bg/95 px-sm py-xs backdrop-blur">
        <div className="flex items-center justify-end gap-lg">
          {[
            { t: NVDA, c: nvda },
            { t: AMD, c: amd },
          ].map(({ t, c }) => (
            <span key={t} className="flex items-center gap-xs">
              <CompanyBadge name={t} size={20} />
              <span className="text-label font-medium" style={{ color: c?.color }}>
                {c?.name ?? t}
              </span>
            </span>
          ))}
        </div>
      </div>

      <TakeawayCallouts />

      <RevenueTrend />

      {/* Metric families — bars do the talking */}
      <div className="mt-xl grid gap-md">
        {comparison.families.map((f, i) => (
          <FamilySection key={f.id} family={f} defaultOpen={i < 2} />
        ))}
      </div>

      {/* Revenue segments */}
      <h2 className="mt-2xl text-heading font-medium text-ink">Where the revenue comes from</h2>
      <p className="mt-xs max-w-2xl text-body text-ink-soft">
        Tap a segment to inspect the reading. Names and figures are from each company&rsquo;s
        latest 10-K.
      </p>
      <div className="mt-md grid gap-md md:grid-cols-2">
        <SegmentStack side="nvda" />
        <SegmentStack side="amd" />
      </div>

      {/* Products, customers, pricing */}
      <h2 className="mt-2xl text-heading font-medium text-ink">Products, customers, pricing</h2>
      <div className="mt-md">
        <ProductsCustomersPricing />
      </div>

      {/* Known gaps — collapsed by default */}
      <details className="mt-2xl rounded-card border border-dashed border-line bg-surface p-md">
        <summary className="cursor-pointer text-eyebrow uppercase text-ink-faint">
          Known gaps — listed, not hidden ({comparison.gaps.length})
        </summary>
        <ul className="mt-xs grid gap-2xs text-caption text-ink-soft">
          {comparison.gaps.map((g, i) => (
            <li key={i}>• {g}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
