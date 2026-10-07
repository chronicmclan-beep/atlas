import { useMemo, useState } from 'react'
import { METRICS, resolveFigure } from '../../lib/compareMetrics.js'
import { colorOf, nameOf, GROUPS } from '../shared/companyGroups.js'
import { InfoButton, parseScalar } from '../shared/LabShared.jsx'

/*
  Lab variant — "Margin pyramid" (infographic elements experiment).

  One company's P&L as a stacked pyramid: four trapezoid layers, top to
  bottom — Revenue → Gross profit → Operating income → Net income — with
  layer widths proportional to the dollar values.

  Revenue and net income resolve through resolveFigure. Gross profit and
  operating income are DERIVED deterministically: revenue × the reported
  gross-margin / operating-margin percentages (parsed with parseScalar).
  That derivation is labeled wherever the numbers appear, with the honesty
  note under the pyramid. A missing margin figure never breaks the pyramid:
  the layer renders as a slim "Not sourced" slot and the rest still draws.

  Compare toggle adds a second company's pyramid side-by-side; layer widths
  animate on company change via CSS transitions.

  Data contract: figures resolve ONLY through resolveFigure (+ the stated,
  labeled derivation). Nothing is hardcoded.
*/

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

function formatDollars(num) {
  if (num == null || !isFinite(num)) return null
  const abs = Math.abs(num)
  const sign = num < 0 ? '−' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

function formatPct(num) {
  if (num == null || !isFinite(num)) return null
  return `${num.toFixed(1)}%`
}

/** Build the four pyramid layers for one ticker. */
function buildLayers(ticker) {
  const revenueFig = resolveFigure('revenue', ticker)
  const netIncomeFig = resolveFigure('net-income', ticker)
  const grossMarginFig = resolveFigure('gross-margin', ticker)
  const opMarginFig = resolveFigure('op-margin', ticker)
  const netMarginFig = resolveFigure('net-margin', ticker)

  const revenue = parseScalar(revenueFig?.value)
  const netIncome = parseScalar(netIncomeFig?.value)

  const grossMarginPct = parseScalar(grossMarginFig?.value)
  const opMarginPct = parseScalar(opMarginFig?.value)
  const netMarginPct =
    parseScalar(netMarginFig?.value) ??
    (revenue && netIncome ? (netIncome / revenue) * 100 : null)

  const grossProfit =
    revenue != null && grossMarginPct != null ? (revenue * grossMarginPct) / 100 : null
  const opIncome =
    revenue != null && opMarginPct != null ? (revenue * opMarginPct) / 100 : null

  const base = revenue != null && revenue > 0 ? revenue : null

  return [
    {
      id: 'revenue',
      label: 'Revenue',
      value: revenue,
      display: revenueFig?.value ?? null,
      marginPct: null,
      pct: base != null ? 100 : null,
      fig: revenueFig,
    },
    {
      id: 'gross-profit',
      label: 'Gross profit',
      value: grossProfit,
      display: grossProfit != null ? formatDollars(grossProfit) : null,
      marginPct: grossMarginPct,
      pct: base != null && grossProfit != null ? Math.min(100, (grossProfit / base) * 100) : null,
      computed: grossProfit != null,
      fig: grossMarginFig,
    },
    {
      id: 'op-income',
      label: 'Operating income',
      value: opIncome,
      display: opIncome != null ? formatDollars(opIncome) : null,
      marginPct: opMarginPct,
      pct: base != null && opIncome != null ? Math.min(100, (opIncome / base) * 100) : null,
      computed: opIncome != null,
      fig: opMarginFig,
    },
    {
      id: 'net-income',
      label: 'Net income',
      value: netIncome,
      display: netIncomeFig?.value ?? null,
      marginPct: netMarginPct,
      pct: base != null && netIncome != null ? Math.min(100, (netIncome / base) * 100) : null,
      fig: netIncomeFig,
    },
  ]
}

/* ------------------------------------------------------------------ */
/* Chip selector — single company                                       */
/* ------------------------------------------------------------------ */

function ChipSelector({ label, selected, onSelect, exclude }) {
  return (
    <div>
      <div className="text-eyebrow uppercase text-ink-faint">{label}</div>
      <div className="mt-xs flex flex-col gap-md">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-2xs text-caption font-medium text-ink-faint">{g.label}</div>
            <div className="flex flex-wrap gap-2xs">
              {g.tickers.map((t) => {
                if (exclude && t === exclude) return null
                const on = t === selected
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => !on && onSelect(t)}
                    aria-pressed={on}
                    title={nameOf(t)}
                    className={
                      'flex items-center gap-2xs rounded-pill border px-2xs py-2xs text-caption transition-all ' +
                      (on
                        ? 'border-transparent font-medium text-white'
                        : 'border-line text-ink-soft hover:border-ink-faint')
                    }
                    style={on ? { background: colorOf(t), borderColor: colorOf(t) } : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: on ? '#fff' : colorOf(t) }}
                    />
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pyramid for one company                                              */
/* ------------------------------------------------------------------ */

function Pyramid({ ticker }) {
  const layers = useMemo(() => buildLayers(ticker), [ticker])
  const color = colorOf(ticker)
  const revenueDef = METRICS.find((m) => m.id === 'revenue')
  const figs = layers
    .map((l) => l.fig)
    .filter((f) => f && f.value != null)
    .map((f) => ({ ...f }))

  return (
    <div className="rounded-card border border-line bg-surface p-md sm:p-lg">
      <div className="flex items-start justify-between gap-sm">
        <div>
          <div className="flex items-center gap-2xs">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <h3 className="text-heading font-medium text-ink">{nameOf(ticker)}</h3>
          </div>
          <p className="mt-2xs text-caption text-ink-faint">P&L pyramid · dollar values</p>
        </div>
        <InfoButton def={revenueDef} figs={figs} />
      </div>

      {/* Pyramid layers: widths proportional to dollar values, revenue = 100% */}
      <div className="mt-md flex flex-col items-center gap-2xs" role="img" aria-label={`${nameOf(ticker)} profit-and-loss pyramid`}>
        {layers.map((layer, i) => {
          const sourced = layer.pct != null
          const widthPct = sourced ? Math.max(layer.pct, 4) : 10
          const opacity = 1 - i * 0.16
          return (
            <div key={layer.id} className="flex w-full flex-col items-center">
              <div
                className="transition-[width] duration-500 ease-out"
                style={{
                  width: `${widthPct}%`,
                  clipPath: 'polygon(0 0, 100% 0, 96.5% 100%, 3.5% 100%)',
                  background: sourced ? color : 'transparent',
                  opacity: sourced ? opacity : 1,
                  border: sourced ? 'none' : '2px dashed',
                  borderColor: sourced ? undefined : color,
                  minHeight: '2.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="px-sm py-xs text-center">
                  <div
                    className="text-label font-medium leading-tight"
                    style={{ color: sourced ? '#fff' : 'var(--color-ink-soft)' }}
                  >
                    {layer.label}
                  </div>
                  <div
                    className="text-body font-semibold leading-tight"
                    style={{ color: sourced ? '#fff' : 'var(--color-ink-faint)' }}
                  >
                    {sourced ? layer.display : 'Not sourced'}
                  </div>
                  {layer.marginPct != null && (
                    <div
                      className="text-caption leading-tight"
                      style={{ color: sourced ? 'rgba(255,255,255,0.85)' : 'var(--color-ink-faint)' }}
                    >
                      {formatPct(layer.marginPct)} margin
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-md text-caption leading-relaxed text-ink-faint">
        Gross profit and operating income computed as revenue × reported margin. Figures from
        verified sources via the comparison registry.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant root — default export, no required props, own state          */
/* ------------------------------------------------------------------ */

export default function VariantPyramid() {
  const [ticker, setTicker] = useState('NVDA')
  const [compare, setCompare] = useState(false)
  const [second, setSecond] = useState('AMD')

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h2 className="text-title font-medium text-ink">Margin pyramid</h2>
          <p className="mt-2xs max-w-xl text-body text-ink-soft">
            One company's profit and loss as a stacked pyramid — revenue at the top, net income at
            the base, layer widths proportional to the dollar values.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCompare((c) => !c)}
          aria-pressed={compare}
          className={
            'inline-flex items-center gap-2xs rounded-pill border px-sm py-xs text-label font-medium transition-colors ' +
            (compare
              ? 'border-transparent text-white'
              : 'border-line text-ink-soft hover:border-ink-faint')
          }
          style={compare ? { background: colorOf(ticker) } : undefined}
        >
          <span
            aria-hidden="true"
            className={'inline-block h-4 w-7 rounded-pill p-2xs transition-colors ' + (compare ? 'bg-white/30' : 'bg-line')}
          >
            <span
              className={'block h-2 w-2 rounded-full bg-white transition-transform ' + (compare ? 'translate-x-3' : '')}
            />
          </span>
          Compare
        </button>
      </div>

      <ChipSelector label="Company" selected={ticker} onSelect={setTicker} />

      {compare && (
        <div className="mt-md">
          <ChipSelector
            label="Comparison company"
            selected={second}
            onSelect={setSecond}
            exclude={ticker}
          />
        </div>
      )}

      <div className={'mt-lg grid gap-md ' + (compare ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
        <Pyramid ticker={ticker} />
        {compare && <Pyramid ticker={second} />}
      </div>
    </div>
  )
}
