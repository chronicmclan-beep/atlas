import { useMemo, useState } from 'react'
import {
  FAMILIES,
  availableMetrics,
  coverage,
  describeGap,
  resolveFigure,
  topTakeaways,
} from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { getCompany } from '../../lib/data.js'
import CompanyBadge from '../../components/common/CompanyBadge.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'

/*
  Lab variant — "Showdown columns".

  Concept: companies are visual COLUMNS, metrics are ROWS crossing them like a
  spec-sheet battle. The user picks 1–4 companies (chips) and any metrics
  (family-grouped chips with live coverage counts); the stage renders:

  - md and up: a true column grid. Sticky header row (color dot + badge +
    company name per column). Each row is one metric; each cell is a MINI
    visual — a mini bar (value relative to the row max, company color) for
    scalars, a mini gauge arc for percentages, a text chip for non-scalars.
    The row leader's cell gets ▲, but only when higherIsBetter is not null.
  - below md: one stacked company card per company, each holding its own
    metric rows with mini bars. No horizontal scroll at 390px, ever.

  Tapping any metric row expands a full-width explanation panel beneath it:
  the registry's what / why / good layers, the generated "what this result
  means" (describeGap on the live selection), and a per-figure source line
  (SourceTag + source + asOf). Hero takeaway callouts from topTakeaways()
  sit on top of the stage.

  Data rules (shared with the production comparison builder):
  - Figures resolve ONLY via resolveFigure(metricId, ticker) → figure or null.
    Nothing is hardcoded here.
  - Only metrics with coverage(metricId, tickers) > 0 are shown.
  - Deselecting the last company or the last metric is blocked, so the stage
    is never empty.
  - No advisory language anywhere: this section explains figures; it does
    not advise on securities.
*/

const GROUPS = [
  { label: 'Chip Design', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'MRVL', 'ARM'] },
  { label: 'Compute Providers', tickers: ['MSFT', 'AMZN', 'GOOGL', 'Meta', 'Oracle', 'CRWV'] },
]
const ALL_TICKERS = GROUPS.flatMap((g) => g.tickers)
const MAX_COMPANIES = 4
const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const DEFAULT_METRICS = ['revenue', 'gross-margin', 'op-margin', 'net-income', 'fcf']

/* Company display helpers — color and name come from companies.json. */
function colorOf(ticker) {
  return getCompany(ticker)?.color ?? '#888888'
}
function nameOf(ticker) {
  return getCompany(ticker)?.name ?? ticker
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

/* ------------------------------------------------------------------ */
/* Mini visuals — one cell of the showdown grid                         */
/* ------------------------------------------------------------------ */

/* Mini bar: value relative to the row max, filled in the company color. */
function MiniBar({ frac, color }) {
  return (
    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-raised">
      <div
        className="h-full rounded-pill"
        style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%`, background: color }}
      />
    </div>
  )
}

/* Mini gauge arc: a semicircle whose filled arc is the parsed percentage. */
function MiniGauge({ frac, color }) {
  const W = 56
  const H = 30
  const R = 24
  const cx = W / 2
  const cy = H - 3
  const a = Math.max(0, Math.min(1, frac)) * Math.PI
  const x = (cx - R * Math.cos(a)).toFixed(1)
  const y = (cy - R * Math.sin(a)).toFixed(1)
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke="var(--surface-raised)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${x} ${y}`}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/*
  One metric cell: picks the mini visual by value shape.
  - def.visual === 'chips' or no parseable scalar → text chip.
  - percentage string (e.g. "72.0%") → mini gauge arc.
  - any other scalar → mini bar relative to the row max.
*/
function MiniCell({ fig, ticker, frac, isLeader, markLeader }) {
  const color = colorOf(ticker)
  if (!fig || fig.value == null) {
    return <span className="text-caption italic text-ink-faint">Not sourced</span>
  }
  const n = parseScalar(fig.value)
  const isPct = n != null && /%/.test(fig.value) && n >= 0 && n <= 100
  return (
    <div className="flex min-w-0 flex-col gap-2xs">
      <div className="flex items-baseline justify-between gap-xs">
        <span className="min-w-0 truncate text-caption font-medium text-ink">{fig.value}</span>
        {markLeader && isLeader && (
          <span aria-label="Row leader" title="Row leader" className="shrink-0 text-caption font-bold" style={{ color }}>
            ▲
          </span>
        )}
      </div>
      {isPct ? (
        <MiniGauge frac={n / 100} color={color} />
      ) : n != null ? (
        <MiniBar frac={frac} color={color} />
      ) : (
        <span className="inline-flex max-w-full self-start truncate rounded-pill border border-line bg-surface-raised px-xs py-2xs text-caption text-ink-soft">
          {fig.value}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Explanation panel — the 4 layers + per-figure sources                 */
/* ------------------------------------------------------------------ */

function ExplainPanel({ def, figs }) {
  const layers = [
    ['What it is', def.explain.what],
    ['Why it matters', def.explain.why],
    ['What good looks like', def.explain.good],
    ['What this result means', describeGap(def, figs)],
  ]
  const withVal = figs.filter((f) => f && f.value != null)
  const missing = figs.filter((f) => !f || f.value == null).map((f) => f?.ticker ?? '?')
  return (
    <div className="border-t border-line/60 px-sm py-sm">
      <dl className="grid gap-sm md:grid-cols-2">
        {layers.map(([title, body]) => (
          <div key={title}>
            <dt className="text-eyebrow uppercase text-ink-faint">{title}</dt>
            <dd className="mt-2xs text-label text-ink-soft">{body}</dd>
          </div>
        ))}
      </dl>
      {withVal.length > 0 && (
        <div className="mt-sm grid gap-2xs border-t border-line/60 pt-sm md:grid-cols-2">
          {withVal.map((f) => (
            <div key={f.ticker} className="flex flex-wrap items-center gap-xs text-caption text-ink-faint">
              <CompanyBadge name={f.ticker} size={14} />
              <span className="font-medium text-ink">{f.ticker}</span>
              <span className="text-ink-soft">{f.value}</span>
              <SourceTag tier={f.tier} />
              <span className="italic">{f.source}{f.asOf ? ` · ${f.asOf}` : ''}</span>
            </div>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <p className="mt-xs text-caption italic text-ink-faint">
          Not sourced for: {missing.join(', ')}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Row math — resolved figures, leaders, bar fractions                   */
/* ------------------------------------------------------------------ */

function useRowData(def, tickers) {
  return useMemo(() => {
    const figs = tickers.map((t) => resolveFigure(def.id, t))
    const parsed = figs.map((f) => (f && f.value != null ? parseScalar(f.value) : null))
    // Leader: best parsed scalar. Marked only when higherIsBetter is set.
    let leaderIdx = -1
    if (def.higherIsBetter != null) {
      const scored = parsed
        .map((n, i) => ({ n, i }))
        .filter((s) => s.n != null)
      if (scored.length > 0) {
        const best = scored.reduce((a, b) =>
          def.higherIsBetter === false ? (a.n < b.n ? a : b) : (a.n > b.n ? a : b)
        )
        leaderIdx = best.i
      }
    }
    // Bar fractions: relative to the largest absolute parsed value in the row.
    const absMax = Math.max(0, ...parsed.filter((n) => n != null).map((n) => Math.abs(n)))
    const fracs = parsed.map((n) => (n == null || absMax === 0 ? 0 : Math.abs(n) / absMax))
    const missing = figs.filter((f) => !f || f.value == null).length
    return { figs, fracs, leaderIdx, missing }
  }, [def, tickers])
}

/* ------------------------------------------------------------------ */
/* md+ layout: the true column grid                                      */
/* ------------------------------------------------------------------ */

function ShowdownGrid({ defs, tickers, openId, onToggleRow }) {
  const labelCol = 'minmax(170px, 1.2fr)'
  const gridCols = { gridTemplateColumns: `${labelCol} repeat(${tickers.length}, minmax(0, 1fr))` }
  return (
    <div className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-card md:block">
      {/* Sticky column headers: color dot + badge + name per company. */}
      <div className="sticky top-0 z-10 grid border-b border-line bg-surface" style={gridCols}>
        <div className="px-sm py-xs text-eyebrow uppercase text-ink-faint">Metric</div>
        {tickers.map((t) => (
          <div key={t} className="flex items-center gap-xs px-sm py-xs">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colorOf(t) }}
            />
            <CompanyBadge name={t} size={20} />
            <span className="min-w-0">
              <span className="block truncate text-label font-medium text-ink">{nameOf(t)}</span>
              <span className="block text-caption text-ink-faint">{t}</span>
            </span>
          </div>
        ))}
      </div>
      {/* One row per metric: label cell + mini-visual cells. Tapping the row
          expands the full-width explanation panel beneath it. */}
      {defs.map((def) => (
        <MetricGridRow key={def.id} def={def} tickers={tickers} gridCols={gridCols} open={openId === def.id} onToggle={() => onToggleRow(def.id)} />
      ))}
    </div>
  )
}

function MetricGridRow({ def, tickers, gridCols, open, onToggle }) {
  const { figs, fracs, leaderIdx, missing } = useRowData(def, tickers)
  const familyLabel = FAMILIES.find((f) => f.id === def.family)?.label ?? def.family
  return (
    <div className="border-b border-line/60 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full items-start text-left transition-colors hover:bg-surface-hover"
        style={gridCols}
      >
        <span className="flex min-w-0 items-start justify-between gap-sm px-sm py-sm">
          <span className="min-w-0">
            <span className="block text-eyebrow uppercase text-ink-faint">{familyLabel}</span>
            <span className="mt-2xs block text-label font-medium text-ink">{def.label}</span>
            {missing > 0 && (
              <span className="mt-2xs block text-caption italic text-ink-faint">
                {missing} without data
              </span>
            )}
          </span>
          <Chevron open={open} className="mt-2xs" />
        </span>
        {tickers.map((t, i) => (
          <span key={t} className="block px-sm py-sm">
            <MiniCell
              fig={figs[i]}
              ticker={t}
              frac={fracs[i]}
              isLeader={i === leaderIdx}
              markLeader={def.higherIsBetter != null}
            />
          </span>
        ))}
      </button>
      {open && <ExplainPanel def={def} figs={figs} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mobile layout (<md): one stacked card per company                     */
/* ------------------------------------------------------------------ */

function CompanyCards({ defs, tickers, openKey, onToggleRow }) {
  // How many rows each company leads — a quick scoreboard on each card.
  const leadCount = useMemo(() => {
    const counts = Object.fromEntries(tickers.map((t) => [t, 0]))
    for (const def of defs) {
      const figs = tickers.map((t) => resolveFigure(def.id, t))
      const parsed = figs.map((f) => (f && f.value != null ? parseScalar(f.value) : null))
      const scored = parsed.map((n, i) => ({ n, i })).filter((s) => s.n != null)
      if (def.higherIsBetter != null && scored.length > 0) {
        const best = scored.reduce((a, b) =>
          def.higherIsBetter === false ? (a.n < b.n ? a : b) : (a.n > b.n ? a : b)
        )
        counts[tickers[best.i]] += 1
      }
    }
    return counts
  }, [defs, tickers])
  return (
    <div className="grid gap-sm md:hidden">
      {tickers.map((t) => (
        <section key={t} aria-label={nameOf(t)} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <header className="flex items-center gap-xs border-b border-line/60 px-sm py-xs">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: colorOf(t) }}
            />
            <CompanyBadge name={t} size={22} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-label font-medium text-ink">{nameOf(t)}</span>
              <span className="block text-caption text-ink-faint">{t}</span>
            </span>
            {leadCount[t] > 0 && (
              <span className="rounded-pill bg-surface-raised px-xs py-2xs text-caption font-medium" style={{ color: colorOf(t) }}>
                ▲ {leadCount[t]} {leadCount[t] === 1 ? 'metric' : 'metrics'}
              </span>
            )}
          </header>
          <div>
            {defs.map((def) => (
              <MetricCardRow
                key={def.id}
                def={def}
                ticker={t}
                tickers={tickers}
                open={openKey === `${t}:${def.id}`}
                onToggle={() => onToggleRow(`${t}:${def.id}`)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MetricCardRow({ def, ticker, tickers, open, onToggle }) {
  const { figs, fracs, leaderIdx } = useRowData(def, tickers)
  const i = tickers.indexOf(ticker)
  return (
    <div className="border-b border-line/60 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-sm px-sm py-xs text-left transition-colors hover:bg-surface-hover"
      >
        <span className="w-24 shrink-0">
          <span className="block text-caption font-medium leading-tight text-ink">{def.label}</span>
        </span>
        <span className="min-w-0 flex-1">
          <MiniCell
            fig={figs[i]}
            ticker={ticker}
            frac={fracs[i]}
            isLeader={i === leaderIdx}
            markLeader={def.higherIsBetter != null}
          />
        </span>
        <Chevron open={open} />
      </button>
      {open && <ExplainPanel def={def} figs={figs} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pickers                                                               */
/* ------------------------------------------------------------------ */

function CompanyPicker({ selected, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-sm">
        <h2 className="text-heading font-medium text-ink">Companies</h2>
        <span className="text-caption text-ink-faint">
          {selected.length} of {MAX_COMPANIES} selected
        </span>
      </div>
      {GROUPS.map((g) => (
        <div key={g.label} className="mt-sm">
          <div className="text-eyebrow uppercase text-ink-faint">{g.label}</div>
          <div className="mt-xs flex flex-wrap gap-xs">
            {g.tickers.map((t) => {
              const isSel = selected.includes(t)
              const disableRemove = isSel && selected.length === 1
              const disableAdd = !isSel && selected.length >= MAX_COMPANIES
              const disabled = disableRemove || disableAdd
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(t)}
                  aria-pressed={isSel}
                  title={disableRemove ? 'Keep at least one company' : nameOf(t)}
                  className={
                    'inline-flex items-center gap-xs rounded-pill border px-sm py-2xs text-caption transition-all ' +
                    (isSel
                      ? 'border-transparent font-medium text-white'
                      : 'border-line bg-surface text-ink-soft hover:bg-surface-hover') +
                    (disabled && !isSel ? ' opacity-40' : '')
                  }
                  style={isSel ? { background: colorOf(t) } : undefined}
                >
                  <CompanyBadge name={t} size={16} />
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="mt-xs text-caption text-ink-faint">
        Pick 1–4 companies. The last selection stays so the showdown never goes empty.
      </p>
    </div>
  )
}

function MetricPicker({ tickers, selectedIds, onToggle }) {
  const [openFamilies, setOpenFamilies] = useState(() =>
    Object.fromEntries(FAMILIES.map((f) => [f.id, true]))
  )
  // Registry-wide: every metric that has data for at least one Atlas company.
  // Coverage counts on the chips reflect the LIVE company selection.
  const available = useMemo(() => availableMetrics(ALL_TICKERS), [])
  const byFamily = useMemo(() => {
    const map = Object.fromEntries(FAMILIES.map((f) => [f.id, []]))
    for (const def of available) {
      if (map[def.family]) map[def.family].push(def)
    }
    return map
  }, [available])
  return (
    <div className="mt-lg">
      <h2 className="text-heading font-medium text-ink">Metrics</h2>
      <p className="mt-2xs text-caption text-ink-faint">
        Only metrics with data for at least one Atlas company appear. Coverage counts
        update with your company selection.
      </p>
      <div className="mt-sm grid gap-sm">
        {FAMILIES.map((f) => {
          const defs = byFamily[f.id]
          if (defs.length === 0) return null
          const open = openFamilies[f.id]
          return (
            <div key={f.id} className="overflow-hidden rounded-card border border-line bg-surface">
              <button
                type="button"
                onClick={() => setOpenFamilies((o) => ({ ...o, [f.id]: !o[f.id] }))}
                aria-expanded={open}
                className="flex w-full items-center gap-sm px-sm py-xs text-left"
              >
                <span className="flex-1 text-label font-medium text-ink">{f.label}</span>
                <span className="text-caption text-ink-faint">
                  {defs.filter((d) => selectedIds.includes(d.id)).length}/{defs.length}
                </span>
                <Chevron open={open} />
              </button>
              {open && (
                <div className="flex flex-wrap gap-xs border-t border-line/60 px-sm py-sm">
                  {defs.map((d) => {
                    const cov = coverage(d.id, tickers)
                    const isSel = selectedIds.includes(d.id)
                    const hasData = cov > 0
                    const disableRemove = isSel && selectedIds.length === 1
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!hasData || disableRemove}
                        onClick={() => onToggle(d.id)}
                        aria-pressed={isSel}
                        title={
                          disableRemove
                            ? 'Keep at least one metric'
                            : hasData
                              ? `${d.label} — data for ${cov} of ${tickers.length}`
                              : 'No data for these companies'
                        }
                        className={
                          'inline-flex items-center gap-xs rounded-pill border px-sm py-2xs text-caption transition-all ' +
                          (isSel
                            ? 'border-transparent font-medium text-white'
                            : hasData
                              ? 'border-line bg-surface-raised text-ink-soft hover:bg-surface-hover'
                              : 'cursor-not-allowed border-line/60 bg-surface text-ink-faint opacity-60')
                        }
                        style={isSel ? { background: 'var(--accent)' } : undefined}
                      >
                        {d.label}
                        <span className={isSel ? 'opacity-80' : 'text-ink-faint'}>
                          {cov} of {tickers.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero takeaways                                                        */
/* ------------------------------------------------------------------ */

function Takeaways({ metricIds, tickers }) {
  const cards = useMemo(() => topTakeaways(metricIds, tickers), [metricIds, tickers])
  if (cards.length === 0) {
    return (
      <p className="mt-lg text-caption text-ink-faint">
        No wide gaps in the current selection — the biggest relative spreads show up here.
      </p>
    )
  }
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
/* The variant                                                           */
/* ------------------------------------------------------------------ */

export default function CompareShowdown() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [metricIds, setMetricIds] = useState(DEFAULT_METRICS)
  const [openId, setOpenId] = useState(null) // grid row expansion: metric id
  const [openKey, setOpenKey] = useState(null) // mobile card expansion: "ticker:metricId"

  const toggleCompany = (t) => {
    if (tickers.includes(t)) {
      if (tickers.length === 1) return // never empty the stage
      const next = tickers.filter((x) => x !== t)
      setTickers(next)
      // Drop metrics that lost all coverage under the new selection.
      setMetricIds((ids) => ids.filter((id) => coverage(id, next) > 0))
    } else {
      if (tickers.length >= MAX_COMPANIES) return
      setTickers([...tickers, t])
    }
    setOpenId(null)
    setOpenKey(null)
  }

  const toggleMetric = (id) => {
    if (metricIds.includes(id)) {
      if (metricIds.length === 1) return // never empty the stage
      setMetricIds(metricIds.filter((x) => x !== id))
    } else {
      setMetricIds([...metricIds, id])
    }
    setOpenId(null)
    setOpenKey(null)
  }

  // Only metrics with live coverage render as rows — registry order kept.
  const defs = useMemo(
    () =>
      metricIds
        .map((id) => availableMetrics(ALL_TICKERS).find((m) => m.id === id))
        .filter((d) => d && coverage(d.id, tickers) > 0),
    [metricIds, tickers]
  )

  const toggleRow = (id) => setOpenId((o) => (o === id ? null : id))
  const toggleCardRow = (key) => setOpenKey((o) => (o === key ? null : key))

  return (
    <div>
      {/* Compact pickers: companies first, then metrics. */}
      <CompanyPicker selected={tickers} onToggle={toggleCompany} />
      <MetricPicker tickers={tickers} selectedIds={metricIds} onToggle={toggleMetric} />

      {/* Hero takeaways from the live selection. */}
      <Takeaways metricIds={defs.map((d) => d.id)} tickers={tickers} />

      {/* The showdown stage: true column grid on md+, stacked company
          cards below md. Both stay scroll-free on a 390px viewport. */}
      <div className="mt-lg">
        <ShowdownGrid defs={defs} tickers={tickers} openId={openId} onToggleRow={toggleRow} />
        <CompanyCards defs={defs} tickers={tickers} openKey={openKey} onToggleRow={toggleCardRow} />
      </div>

      <p className="mt-sm text-caption italic text-ink-faint">
        ▲ marks the row leader where a higher or lower value is unambiguously stronger.
        Lab experiment — figures resolve from the same verified datasets as production.
      </p>
    </div>
  )
}
