import { useState } from 'react'
import { comparison, getCompany } from '../../lib/data.js'
import SectionHeader from '../common/SectionHeader.jsx'
import SourceTag from '../common/SourceTag.jsx'
import CompanyBadge from '../common/CompanyBadge.jsx'
import CompareIcon from '../common/icons/CompareIcon.jsx'

/*
  Section 08 — Head-to-head.
  The first slice of the comparison engine: NVIDIA vs AMD, metric by metric.
  Every row carries the one-line reading; tapping a row opens the four-layer
  explanation (what it is / why it matters / what good looks like / what this
  result means). Figures come from comparison.json — nothing is hardcoded.
  Interactivity: hover-highlight on rows and bars, tap-to-expand everywhere.
  This section explains figures; it does not advise on securities.
*/

const NVDA = 'NVDA'
const AMD = 'AMD'

function FigureCell({ fig, company, stronger }) {
  if (!fig || fig.value == null) {
    return (
      <div className="flex items-center gap-xs">
        <span className="text-ink-faint">Not yet sourced</span>
        <SourceTag tier="unsourced" showLabel={false} />
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-xs">
      <span className="font-medium text-ink">
        {fig.value}
        {stronger === company && (
          <span aria-label="Stronger value" title="Stronger value" className="ml-2xs text-ink">
            ▲
          </span>
        )}
      </span>
      <SourceTag tier={fig.tier} showLabel={false} />
    </div>
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
    <div className="col-span-2 grid gap-sm border-t border-line/60 pt-sm md:col-span-3 md:grid-cols-2">
      {layers.map(([title, body]) => (
        <div key={title}>
          <div className="text-eyebrow uppercase text-ink-faint">{title}</div>
          <p className="mt-2xs text-label text-ink-soft">{body}</p>
        </div>
      ))}
    </div>
  )
}

function MetricRow({ metric }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid w-full grid-cols-2 gap-x-md gap-y-xs px-sm py-sm text-left transition-colors hover:bg-surface-hover md:grid-cols-[1.7fr_1fr_1fr]"
      >
        <span className="col-span-2 md:col-span-1">
          <span className="flex items-center gap-xs text-label font-medium text-ink">
            {metric.label}
            <span
              aria-hidden="true"
              className={'text-ink-faint transition-transform ' + (open ? 'rotate-90' : '')}
            >
              ›
            </span>
          </span>
          <span className="mt-2xs block text-caption text-ink-soft">{metric.reading}</span>
        </span>
        <span className="text-label">
          <FigureCell fig={metric.nvda} company={NVDA} stronger={metric.stronger} />
        </span>
        <span className="text-label">
          <FigureCell fig={metric.amd} company={AMD} stronger={metric.stronger} />
        </span>
        {open && <ExplainPanel explain={metric.explain} />}
      </button>
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
          <span className="text-caption text-ink-faint">
            {family.metrics.length} metrics
          </span>
          <span
            aria-hidden="true"
            className={'text-body text-ink-faint transition-transform ' + (open ? 'rotate-90' : '')}
          >
            ›
          </span>
        </span>
      </button>
      {open && (
        <div>
          {family.metrics.map((m) => (
            <MetricRow key={m.label} metric={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentBars({ side }) {
  const [open, setOpen] = useState(false)
  const company = getCompany(side === 'nvda' ? NVDA : AMD)
  return (
    <div className="rounded-card border border-line bg-surface p-md shadow-card">
      <div className="flex items-center gap-xs">
        <CompanyBadge name={side === 'nvda' ? NVDA : AMD} size={22} />
        <span className="text-heading font-medium" style={{ color: company?.color }}>
          {company?.name ?? side.toUpperCase()}
        </span>
      </div>
      <div className="mt-2xs text-caption text-ink-faint">{comparison.segments[side].period}</div>
      <div className="mt-sm grid gap-xs">
        {comparison.segments[side].segments.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="group block w-full rounded-control p-xs text-left transition-colors hover:bg-surface-hover"
            title="Tap to inspect"
          >
            <div className="flex items-baseline justify-between gap-sm text-label">
              <span className="font-medium text-ink">{s.name}</span>
              <span className="shrink-0 text-ink-soft">
                {s.revenue} · {s.share}
              </span>
            </div>
            <div className="mt-2xs h-2.5 overflow-hidden rounded-pill bg-surface-raised">
              <div
                className="h-full rounded-pill transition-all"
                style={{
                  width: s.share,
                  background: company?.color ?? 'var(--ink-faint)',
                }}
              />
            </div>
            {open && <p className="mt-xs text-caption text-ink-soft">{s.reading}</p>}
          </button>
        ))}
      </div>
      <div className="mt-xs flex items-center gap-xs">
        <SourceTag tier={comparison.segments[side].tier} showLabel={false} />
        <span className="text-caption text-ink-faint">{comparison.segments[side].source}</span>
      </div>
      <p className="mt-sm text-label text-ink-soft">{comparison.segments[side].takeaway}</p>
    </div>
  )
}

function ProductsCustomersPricing() {
  const [tab, setTab] = useState('products')
  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
    { id: 'pricing', label: 'Pricing' },
  ]
  return (
    <div className="rounded-card border border-line bg-surface p-md shadow-card">
      <div className="flex gap-2xs" role="tablist" aria-label="Products, customers and pricing">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
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
        <ul className="mt-md grid gap-sm md:grid-cols-2">
          {comparison.products.map((p, i) => (
            <li
              key={`${p.company}-${i}`}
              className="rounded-control border border-line/60 p-sm transition-colors hover:bg-surface-hover"
              title="Tap to inspect"
            >
              <div className="flex items-center gap-xs">
                <span
                  className="text-eyebrow uppercase"
                  style={{ color: getCompany(p.company)?.color }}
                >
                  {p.company}
                </span>
                <SourceTag tier={p.tier} showLabel={false} />
              </div>
              <div className="mt-2xs text-label font-medium text-ink">{p.line}</div>
              <p className="mt-2xs text-caption text-ink-soft">{p.desc}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === 'customers' && (
        <ul className="mt-md grid gap-sm">
          {comparison.customers.map((c, i) => (
            <li
              key={i}
              className="rounded-control border border-line/60 p-sm transition-colors hover:bg-surface-hover"
              title="Tap to inspect"
            >
              <div className="flex flex-wrap items-center gap-xs">
                <span className="text-label font-medium text-ink">{c.customer}</span>
                <SourceTag tier={c.tier} />
              </div>
              <p className="mt-2xs text-caption text-ink-soft">
                Buys from {c.buysFrom} — {c.evidence}
              </p>
            </li>
          ))}
        </ul>
      )}

      {tab === 'pricing' && (
        <div className="mt-md">
          <p className="text-caption text-ink-faint">
            Neither company publishes official per-unit data-center prices. Estimates are
            press reporting, labeled as such — never presented as official figures.
          </p>
          <ul className="mt-sm grid gap-xs">
            {comparison.pricing.map((p, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-x-md gap-y-2xs rounded-control border border-line/60 px-sm py-xs transition-colors hover:bg-surface-hover"
                title={p.source}
              >
                <span className="text-label font-medium text-ink">{p.product}</span>
                <span className="flex items-center gap-xs">
                  <span className="text-label text-ink-soft">{p.price ?? 'Not disclosed'}</span>
                  <SourceTag tier={p.tier} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

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

      {/* Sticky company header — stays visible while scrolling the metrics */}
      <div className="sticky top-0 z-10 -mx-sm border-b border-line bg-bg/95 px-sm py-xs backdrop-blur">
        <div className="grid grid-cols-2 gap-x-md md:grid-cols-[1.7fr_1fr_1fr]">
          <span className="col-span-2 text-eyebrow uppercase text-ink-faint md:col-span-1">
            Metric
          </span>
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

      {/* The three things that matter most */}
      <ol className="mt-lg grid gap-sm md:grid-cols-3">
        {comparison.takeaways.map((t, i) => (
          <li
            key={i}
            className="rounded-card border border-line bg-surface p-md shadow-card transition-colors hover:bg-surface-hover"
          >
            <div className="text-eyebrow uppercase text-ink-faint">Takeaway {i + 1}</div>
            <p className="mt-xs text-label text-ink-soft">{t}</p>
          </li>
        ))}
      </ol>

      {/* Metric families */}
      <div className="mt-xl grid gap-md">
        {comparison.families.map((f, i) => (
          <FamilySection key={f.id} family={f} defaultOpen={i < 2} />
        ))}
      </div>

      {/* Revenue segments */}
      <h2 className="mt-2xl text-heading font-medium text-ink">Where the revenue comes from</h2>
      <p className="mt-xs max-w-2xl text-body text-ink-soft">
        Tap any bar to inspect the reading. Segment names and figures are taken from each
        company&rsquo;s latest 10-K.
      </p>
      <div className="mt-md grid gap-md md:grid-cols-2">
        <SegmentBars side="nvda" />
        <SegmentBars side="amd" />
      </div>

      {/* Products, customers, pricing */}
      <h2 className="mt-2xl text-heading font-medium text-ink">
        What they sell, who they sell to, and what it costs
      </h2>
      <div className="mt-md">
        <ProductsCustomersPricing />
      </div>

      {/* Known gaps */}
      <div className="mt-2xl rounded-card border border-dashed border-line bg-surface p-md">
        <div className="text-eyebrow uppercase text-ink-faint">Known gaps — listed, not hidden</div>
        <ul className="mt-xs grid gap-2xs text-caption text-ink-soft">
          {comparison.gaps.map((g, i) => (
            <li key={i}>• {g}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
