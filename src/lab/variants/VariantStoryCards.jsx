/*
  Lab variant — "Story cards" (one of 8 infographic experiments).

  A flippable deck of designed cards: one headline metric per card, an
  OVERSIZED value for the leading company, compact rows for the rest,
  and one plain-English takeaway line per card. Prev/next arrows, dot
  indicators, and a snap-feel slide transition between cards.

  Selection contract: every selected company ALWAYS renders on every
  card. Companies without data for a card's metric show "Not sourced" —
  never silently dropped. Only metrics with coverage > 0 appear as cards.

  Data contract: figures resolve ONLY via resolveFigure(metricId, ticker).
  Nothing is hardcoded. Copy stays free of banned vocabulary; the
  takeaway line is the deterministic describeGap() output.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { METRICS, coverage, resolveFigure, describeGap } from '../../lib/compareMetrics.js'
import { parseScalar } from '../../lib/compareVisual.js'
import { colorOf, nameOf, MAX_COMPANIES } from '../shared/companyGroups.js'
import { CompanyPicker, InfoButton } from '../shared/LabShared.jsx'
import SourceTag from '../../components/common/SourceTag.jsx'
import StaleTag from '../../components/common/StaleTag.jsx'

const CARD_METRICS = ['revenue', 'gross-margin', 'net-income', 'fcf', 'pe-trailing', 'latest-quarter']
const DEFAULT_COMPANIES = ['NVDA', 'AMD']
const MIN_COMPANIES = 2

/** Index into entries of the card's leading company, or -1 when nothing parses. */
function leaderIndex(def, entries) {
  const scored = entries
    .map((e, i) => ({ i, n: parseScalar(e.fig?.value) }))
    .filter((s) => s.n != null)
  if (scored.length === 0) {
    return entries.findIndex((e) => e.fig) // still show someone oversized
  }
  const desc = def.higherIsBetter !== false
  const pick = desc
    ? scored.reduce((a, b) => (b.n > a.n ? b : a))
    : scored.reduce((a, b) => (b.n < a.n ? b : a))
  return pick.i
}

/* ------------------------------------------------------------------ */
/* One card in the deck                                                 */
/* ------------------------------------------------------------------ */

function StoryCard({ def, tickers, badge }) {
  const entries = useMemo(
    () => tickers.map((t) => ({ ticker: t, fig: resolveFigure(def.id, t) })),
    [def, tickers],
  )
  const leadIdx = leaderIndex(def, entries)
  const lead = leadIdx >= 0 ? entries[leadIdx] : null
  const others = entries.filter((_, i) => i !== leadIdx)
  const withData = entries.filter((e) => e.fig).length
  const gapLine = describeGap(
    def,
    entries.map((e) => e.fig),
  )
  const leadColor = lead ? colorOf(lead.ticker) : '#888888'

  return (
    <article
      aria-label={`${def.label} — card ${badge}`}
      className="flex min-h-[340px] flex-col rounded-card border border-line bg-surface p-lg shadow-card sm:p-xl"
    >
      {/* header: badge + label + info */}
      <div className="flex items-start justify-between gap-sm">
        <div className="flex items-center gap-md">
          <span
            aria-hidden="true"
            className="select-none text-[52px] font-black leading-none tracking-tight sm:text-[64px]"
            style={{ color: leadColor + '2b' }}
          >
            {badge}
          </span>
          <div>
            <div className="text-eyebrow uppercase text-ink-faint">Card {badge}</div>
            <h3 className="mt-2xs text-heading font-semibold text-ink">{def.label}</h3>
          </div>
        </div>
        <InfoButton def={def} figs={entries.map((e) => e.fig).filter(Boolean)} />
      </div>
      <p className="mt-xs max-w-xl text-caption leading-relaxed text-ink-soft">{def.explain.what}</p>

      {/* leader: oversized value */}
      <div className="mt-lg">
        {lead && lead.fig ? (
          <>
            <div className="flex flex-wrap items-center gap-xs">
              <span className="h-3 w-3 rounded-full" style={{ background: leadColor }} />
              <span className="text-label font-semibold text-ink">
                {lead.ticker}
                <span className="ml-2xs font-normal text-ink-soft">{nameOf(lead.ticker)}</span>
              </span>
              <span className="text-eyebrow uppercase text-ink-faint">leads</span>
            </div>
            <div
              key={lead.ticker + def.id}
              className="mt-2xs break-words text-[44px] font-extrabold leading-none tracking-tight sm:text-[60px]"
              style={{ color: leadColor }}
            >
              {lead.fig.value}
            </div>
            {lead.fig.sub && <div className="mt-2xs text-caption text-ink-faint">{lead.fig.sub}</div>}
            <div className="mt-xs flex flex-wrap items-center gap-2xs">
              <SourceTag source={lead.fig.source} tier={lead.fig.tier} />
              <StaleTag asOf={lead.fig.asOf} />
            </div>
          </>
        ) : (
          <div className="text-body text-ink-faint">No figures sourced for this metric.</div>
        )}
      </div>

      {/* the rest of the deck */}
      {others.length > 0 && (
        <dl className="mt-lg divide-y divide-line/60 border-t border-line/60">
          {others.map(({ ticker, fig }) => (
            <div key={ticker} className="flex items-center justify-between gap-sm py-sm">
              <dt className="flex min-w-0 items-center gap-2xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colorOf(ticker) }}
                />
                <span className="truncate text-label font-medium text-ink" title={nameOf(ticker)}>
                  {ticker}
                </span>
              </dt>
              <dd className="shrink-0 text-label text-ink-soft">
                {fig ? (
                  <span className="font-semibold text-ink">{fig.value}</span>
                ) : (
                  <span className="italic text-ink-faint">Not sourced</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* takeaway */}
      <p className="mt-auto pt-lg text-body font-medium leading-relaxed text-ink">{gapLine}</p>
      {withData < tickers.length && (
        <p className="mt-2xs text-caption text-ink-faint">
          {withData} of {tickers.length} with data
        </p>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* The deck                                                             */
/* ------------------------------------------------------------------ */

export default function VariantStoryCards() {
  const [tickers, setTickers] = useState(DEFAULT_COMPANIES)
  const [index, setIndex] = useState(0)
  const touchX = useRef(null)

  const toggle = (t) =>
    setTickers((prev) => {
      if (prev.includes(t)) {
        if (prev.length <= MIN_COMPANIES) return prev // keep at least two
        return prev.filter((x) => x !== t)
      }
      return prev.length >= MAX_COMPANIES ? prev : [...prev, t]
    })

  const cards = useMemo(
    () =>
      CARD_METRICS.map((id) => METRICS.find((m) => m.id === id))
        .filter(Boolean)
        .filter((def) => coverage(def.id, tickers) > 0),
    [tickers],
  )

  useEffect(() => {
    if (index > cards.length - 1) setIndex(Math.max(0, cards.length - 1))
  }, [cards.length, index])

  const go = (dir) =>
    setIndex((i) => (cards.length === 0 ? 0 : (i + dir + cards.length) % cards.length))

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }

  const pad = (n) => String(n + 1).padStart(2, '0')

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CompanyPicker tickers={tickers} onToggle={toggle} max={MAX_COMPANIES} />

      {cards.length === 0 ? (
        <div className="mt-lg rounded-card border border-line bg-surface p-lg text-body text-ink-soft">
          None of the headline metrics have sourced figures for these companies.
        </div>
      ) : (
        <div className="mt-lg">
          {/* deck with snap-feel slide */}
          <div
            className="overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') go(-1)
              if (e.key === 'ArrowRight') go(1)
            }}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label="Story cards"
          >
            <div
              className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {cards.map((def, i) => (
                <div key={def.id} className="w-full shrink-0 pr-2xs" aria-hidden={i !== index}>
                  <StoryCard def={def} tickers={tickers} badge={pad(i)} />
                </div>
              ))}
            </div>
          </div>

          {/* navigation */}
          <div className="mt-md flex items-center justify-between">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous card"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-heading text-ink transition-colors hover:border-ink-faint hover:bg-surface-hover"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <div className="flex items-center gap-2xs" role="tablist" aria-label="Cards">
              {cards.map((def, i) => (
                <button
                  key={def.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Card ${pad(i)}: ${def.label}`}
                  onClick={() => setIndex(i)}
                  className={
                    'h-2 rounded-full transition-all duration-300 ' +
                    (i === index ? 'w-8 bg-ink' : 'w-2 bg-line hover:bg-ink-faint')
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next card"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-heading text-ink transition-colors hover:border-ink-faint hover:bg-surface-hover"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <p className="mt-xs text-center text-caption text-ink-faint">
            Card {pad(index)} of {pad(cards.length - 1)}
          </p>
        </div>
      )}
    </div>
  )
}
