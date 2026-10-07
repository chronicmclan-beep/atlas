/*
  VariantDuel — "Versus duel" (Section 09 "The Lab").

  Sports-matchup card energy: two companies face off over one metric.
  - Exactly 2 companies (picker constrained to max 2), default NVDA vs AMD.
  - Center stage: the arena — a "VS" medallion plus the MetricDropdown.
  - Each fighter panel shows a BIG animated count-up number, reusing the
    original display string's unit (e.g. animate 0→215.9, render "$215.9B").
  - The leader (higher value, or lower when higherIsBetter is false) gets a
    restrained glow in their company color. Valuation multiples are NOT
    ranked: no glow anywhere, and the "multiples are not ranked" note stays.
  - Missing data renders a "Not sourced" panel, never a glow.

  Figures resolve ONLY through src/lib/compareMetrics.js resolveFigure.
  Colors/names resolve ONLY through companyGroups.js colorOf/nameOf.
  Styling: Atlas theme tokens only. Light/dark clean.
*/
import { useEffect, useMemo, useState } from 'react'
import { METRICS, availableMetrics, describeGap, resolveFigure } from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { colorOf, nameOf } from '../shared/companyGroups.js'
import { CompanyPicker, MetricDropdown, InfoButton, useCountUp } from '../shared/LabShared.jsx'

/* ------------------------------------------------------------------ */
/* parseDisplay — split a display string into display units + dressing  */
/* "$215.9B" -> { num: 215.9, prefix: "$", suffix: "B", decimals: 1 }    */
/* "24.5%"   -> { num: 24.5, prefix: "",  suffix: "%", decimals: 1 }     */
/* returns null when no number is present (ranges, "—", "n/a", …)       */
/* ------------------------------------------------------------------ */
function parseDisplay(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.replace(/[−–—]/g, '-').replace(/,/g, '')
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const after = s.slice(m.index + m[0].length, m.index + m[0].length + 4)
  let suffix = ''
  if (/^\s*T/i.test(after)) suffix = 'T'
  else if (/^\s*B/i.test(after)) suffix = 'B'
  else if (/^\s*M/i.test(after)) suffix = 'M'
  else if (/^\s*K/i.test(after)) suffix = 'K'
  else if (/^\s*%/.test(after)) suffix = '%'
  return {
    num: parseFloat(m[0]),
    prefix: s.slice(0, m.index).trim(),
    suffix,
    decimals: (m[0].split('.')[1] || '').length,
  }
}

/* ------------------------------------------------------------------ */
/* FighterPanel — one side of the duel                                  */
/* ------------------------------------------------------------------ */
function FighterPanel({ ticker, fig, isLeader }) {
  const accent = colorOf(ticker)
  const parsed = useMemo(() => (fig ? parseDisplay(fig.value) : null), [fig])

  // Start from 0 on mount so the first render counts up into the figure;
  // later metric changes animate from the previous figure.
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setStarted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const animated = useCountUp(started && parsed ? parsed.num : 0)

  const display =
    parsed != null
      ? `${parsed.prefix}${animated.toFixed(parsed.decimals)}${parsed.suffix}`
      : fig
        ? fig.value
        : null

  return (
    <div
      className={
        'relative flex min-w-0 flex-col rounded-card border bg-surface p-md transition-shadow duration-500 ' +
        (isLeader ? 'border-transparent' : 'border-line')
      }
      style={
        isLeader
          ? { boxShadow: `0 0 34px -10px ${accent}66, 0 0 0 1.5px ${accent}59` }
          : undefined
      }
    >
      {/* fighter identity */}
      <div className="flex items-center gap-sm">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-caption font-bold text-white"
          style={{ background: accent }}
        >
          {ticker.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="text-label font-semibold text-ink">{ticker}</div>
          <div className="truncate text-caption text-ink-soft">{nameOf(ticker)}</div>
        </div>
      </div>

      {/* the big number */}
      <div className="mt-md min-w-0">
        {fig ? (
          <>
            <div
              className="truncate text-heading font-bold tabular-nums tracking-tight text-ink sm:text-2xl"
              style={{ fontSize: 'clamp(1.5rem, 6vw, 2.25rem)' }}
              aria-label={`${ticker} ${fig.value}`}
            >
              {display}
            </div>
            {fig.sub && <div className="mt-2xs truncate text-caption text-ink-faint">{fig.sub}</div>}
          </>
        ) : (
          <div className="rounded-control border border-dashed border-line px-sm py-md text-center">
            <div className="text-label font-medium text-ink-soft">Not sourced</div>
            <div className="mt-2xs text-caption text-ink-faint">
              No figure available for this metric.
            </div>
          </div>
        )}
      </div>

      {/* leader ribbon */}
      {isLeader && fig && (
        <div className="mt-sm">
          <span
            className="inline-block rounded-pill px-sm py-2xs text-caption font-semibold text-white"
            style={{ background: accent }}
          >
            Leads
          </span>
        </div>
      )}
    </div>
  )
}

/* Empty slot shown while only one company is picked */
function EmptySlot() {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/60 p-md text-center">
      <div className="text-label font-medium text-ink-soft">Open slot</div>
      <div className="mt-2xs text-caption text-ink-faint">
        Pick a second company above to start the duel.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* VariantDuel — default export, no required props, own state           */
/* ------------------------------------------------------------------ */
export default function VariantDuel() {
  const [tickers, setTickers] = useState(['NVDA', 'AMD'])
  const [metricSel, setMetricSel] = useState('revenue')

  const toggle = (t) =>
    setTickers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 2),
    )

  // Fall back to a covered metric if the selection has no coverage here.
  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const metricId = avail.some((m) => m.id === metricSel) ? metricSel : (avail[0]?.id ?? 'revenue')
  const def = METRICS.find((m) => m.id === metricId)

  const figs = useMemo(
    () =>
      tickers.map((t) => {
        const f = def ? resolveFigure(metricId, t) : null
        return f ? { ...f, ticker: t } : null
      }),
    [tickers, metricId, def],
  )

  // Leader only when the metric is rankable (higherIsBetter !== null) and
  // both sides have parseable figures. Valuation multiples never glow.
  const ranked = !!def && def.higherIsBetter !== null
  let leaderIdx = -1
  if (ranked) {
    const n0 = figs[0] ? parseScalar(figs[0].value) : null
    const n1 = figs[1] ? parseScalar(figs[1].value) : null
    if (n0 != null && n1 != null && n0 !== n1) {
      const firstWins = def.higherIsBetter ? n0 > n1 : n0 < n1
      leaderIdx = firstWins ? 0 : 1
    }
  }

  const takeaway = def ? describeGap(def, figs) : ''

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="text-eyebrow uppercase text-ink-faint">The Lab · Infographic experiment</div>
      <h2 className="mt-2xs text-heading font-semibold text-ink">Versus duel</h2>
      <p className="mt-2xs text-body text-ink-soft">
        Two companies, one metric, head to head.
      </p>

      {/* pickers */}
      <div className="mt-md rounded-card border border-line bg-surface p-md">
        <CompanyPicker tickers={tickers} onToggle={toggle} max={2} />
      </div>

      {/* the arena */}
      <div className="relative mt-lg grid grid-cols-2 gap-md">
        <div key={tickers[0] ?? 'left'}>
          <FighterPanel ticker={tickers[0]} fig={figs[0]} isLeader={leaderIdx === 0} />
        </div>
        <div key={tickers[1] ?? 'right'}>
          {tickers[1] ? (
            <FighterPanel ticker={tickers[1]} fig={figs[1]} isLeader={leaderIdx === 1} />
          ) : (
            <EmptySlot />
          )}
        </div>

        {/* VS medallion, overlapping the center gap */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-label font-bold tracking-wide text-ink shadow-card"
        >
          VS
        </div>
      </div>

      {/* metric selection — the arena's center stage */}
      <div className="mt-md flex flex-col items-center gap-sm">
        <div className="text-eyebrow uppercase text-ink-faint">The arena</div>
        <MetricDropdown metricId={metricId} onSelect={setMetricSel} tickers={tickers} />
      </div>

      {/* takeaway + explainer */}
      <div className="mt-md rounded-card border border-line bg-surface p-md">
        <div className="flex items-start gap-sm">
          <p className="flex-1 text-body text-ink-soft">{takeaway}</p>
          <InfoButton def={def} figs={figs} />
        </div>
        {!ranked && def && (
          <p className="mt-sm border-t border-line/60 pt-sm text-caption text-ink-faint">
            Valuation multiples are not ranked — no winner is declared for this metric.
          </p>
        )}
      </div>
    </div>
  )
}
