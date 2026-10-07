/*
  Shared building blocks for Lab variants (Section 09 "The Lab").

  CompanyPicker  — grouped company chips (2–4 tickers, color dots, search).
  MetricDropdown — grouped metric picker with live coverage counts + a tiny
                   hover blurb (the 1-line "what it is" from the registry).
  InfoButton     — small (i) affordance opening the 4-layer explanation modal.
  useCountUp     — animated number transitions (easeOutCubic).

  Data contract: figures resolve ONLY through src/lib/compareMetrics.js.
  Styling: Atlas theme tokens only (text-ink, bg-surface, border-line…),
  light/dark clean, no invented colors.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FAMILIES,
  METRICS,
  coverage,
  availableMetrics,
  describeGap,
} from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { colorOf, nameOf, GROUPS, MAX_COMPANIES } from './companyGroups.js'
import SourceTag from '../../components/common/SourceTag.jsx'
import StaleTag from '../../components/common/StaleTag.jsx'

export { colorOf, nameOf, GROUPS, MAX_COMPANIES, parseScalar }

/* ------------------------------------------------------------------ */
/* CompanyPicker                                                        */
/* ------------------------------------------------------------------ */

export function CompanyPicker({ tickers, onToggle, max = MAX_COMPANIES, showSearch = true }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = GROUPS.map((g) => ({
    ...g,
    tickers: g.tickers.filter(
      (t) => !q || t.toLowerCase().includes(q) || nameOf(t).toLowerCase().includes(q),
    ),
  })).filter((g) => g.tickers.length > 0)

  return (
    <div>
      <div className="text-eyebrow uppercase text-ink-faint">
        Companies · {tickers.length}/{max}
      </div>
      {showSearch && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          aria-label="Search companies"
          className="mt-xs w-full rounded-control border border-line bg-surface px-sm py-2xs text-label text-ink placeholder:text-ink-faint"
        />
      )}
      <div className="mt-sm grid max-h-64 gap-md overflow-y-auto pr-2xs">
        {shown.map((g) => (
          <div key={g.label}>
            <div className="mb-2xs text-caption font-medium text-ink-faint">{g.label}</div>
            <div className="flex flex-wrap gap-2xs">
              {g.tickers.map((t) => {
                const on = tickers.includes(t)
                const lastOne = on && tickers.length === 1
                const full = !on && tickers.length >= max
                const disabled = full || lastOne
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => !disabled && onToggle(t)}
                    disabled={disabled}
                    aria-pressed={on}
                    title={lastOne ? 'At least one company is required' : nameOf(t)}
                    className={
                      'flex items-center gap-2xs rounded-pill border px-2xs py-2xs text-caption transition-all ' +
                      (on
                        ? 'border-transparent font-medium text-white'
                        : 'border-line text-ink-soft hover:border-ink-faint') +
                      (disabled ? ' cursor-default opacity-40' : '')
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
/* MetricDropdown — grouped picker with coverage counts + hover blurb   */
/* ------------------------------------------------------------------ */

export function MetricDropdown({ metricId, onSelect, tickers, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [blurb, setBlurb] = useState(null) // metric id being hovered
  const ref = useRef(null)
  const avail = useMemo(() => availableMetrics(tickers), [tickers])
  const def = METRICS.find((m) => m.id === metricId) ?? avail[0]

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setBlurb(null)
      }
    }
    const esc = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setBlurb(null)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open ])

  const blurbDef = blurb ? METRICS.find((m) => m.id === blurb) : null

  return (
    <div ref={ref} className={'relative inline-block ' + (align === 'right' ? 'text-right' : '')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex max-w-full items-center gap-2xs rounded-control border border-line bg-surface px-sm py-xs text-label font-medium text-ink transition-colors hover:border-ink-faint"
      >
        <span className="truncate">{def ? def.label : 'Metric'}</span>
        <span aria-hidden="true" className="text-ink-faint">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className={
            'absolute z-50 mt-2xs max-h-80 w-72 overflow-y-auto rounded-card border border-line bg-surface p-xs shadow-card ' +
            (align === 'right' ? 'right-0' : 'left-0')
          }
        >
          {FAMILIES.map((f) => {
            const fams = avail.filter((m) => m.family === f.id)
            if (fams.length === 0) return null
            return (
              <div key={f.id} className="mb-xs">
                <div className="px-2xs py-2xs text-eyebrow uppercase text-ink-faint">{f.label}</div>
                {fams.map((m) => {
                  const active = def && m.id === def.id
                  const cov = coverage(m.id, tickers)
                  return (
                    <div key={m.id} className="relative">
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onSelect(m.id)
                          setOpen(false)
                          setBlurb(null)
                        }}
                        onMouseEnter={() => setBlurb(m.id)}
                        onMouseLeave={() => setBlurb(null)}
                        onFocus={() => setBlurb(m.id)}
                        onBlur={() => setBlurb(null)}
                        className={
                          'flex w-full items-center justify-between gap-sm rounded-control px-sm py-2xs text-left text-label transition-colors ' +
                          (active
                            ? 'bg-accent/15 font-medium text-ink'
                            : 'text-ink-soft hover:bg-surface-hover')
                        }
                      >
                        <span className="truncate">{m.label}</span>
                        <span className="shrink-0 text-caption text-ink-faint">
                          {cov} of {tickers.length}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {blurbDef && (
            <div className="pointer-events-none absolute left-full top-0 z-50 ml-sm w-56 rounded-card border border-line bg-surface p-sm shadow-card">
              <div className="text-label font-medium text-ink">{blurbDef.label}</div>
              <div className="mt-2xs text-caption leading-relaxed text-ink-soft">
                {blurbDef.explain.what}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* InfoButton — the 4-layer explanation in a compact modal              */
/* ------------------------------------------------------------------ */

export function InfoButton({ def, figs, label }) {
  const [open, setOpen] = useState(false)
  const ariaLabel = label ?? (def ? `About ${def.label}` : 'About this metric')

  useEffect(() => {
    if (!open) return
    const esc = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open ])

  if (!def) return null
  const withVal = (figs ?? []).filter((f) => f && f.value != null)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        title="What is this metric?"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-caption text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
      >
        <span aria-hidden="true">i</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={def.label}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-card border border-line bg-surface p-lg shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-sm">
              <h3 className="text-heading font-medium text-ink">{def.label}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-control p-2xs text-ink-soft hover:bg-surface-hover hover:text-ink"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <dl className="mt-md grid gap-sm text-body">
              <div>
                <dt className="text-eyebrow uppercase text-ink-faint">What it is</dt>
                <dd className="mt-2xs text-ink-soft">{def.explain.what}</dd>
              </div>
              <div>
                <dt className="text-eyebrow uppercase text-ink-faint">Why it matters</dt>
                <dd className="mt-2xs text-ink-soft">{def.explain.why}</dd>
              </div>
              <div>
                <dt className="text-eyebrow uppercase text-ink-faint">What good looks like</dt>
                <dd className="mt-2xs text-ink-soft">{def.explain.good}</dd>
              </div>
              <div>
                <dt className="text-eyebrow uppercase text-ink-faint">What this result means</dt>
                <dd className="mt-2xs text-ink-soft">{describeGap(def, withVal)}</dd>
              </div>
            </dl>
            {withVal.length > 0 && (
              <div className="mt-md border-t border-line/60 pt-sm">
                {withVal.map((f) => (
                  <div
                    key={f.ticker}
                    className="flex items-center justify-between gap-sm py-2xs text-caption"
                  >
                    <span className="font-medium" style={{ color: colorOf(f.ticker) }}>
                      {f.ticker} · {f.value}
                    </span>
                    <span className="flex items-center gap-2xs text-ink-faint">
                      <SourceTag source={f.source} tier={f.tier} />
                      <StaleTag asOf={f.asOf} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* useCountUp — animated number transitions                            */
/* ------------------------------------------------------------------ */

export function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(target)
  const prevRef = useRef(target)
  useEffect(() => {
    const from = prevRef.current
    if (from === target) return
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * e)
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        prevRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}
