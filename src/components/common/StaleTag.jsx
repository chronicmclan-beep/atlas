import { isStale } from '../../lib/staleness.js'

/*
  StaleTag — a deliberately quiet freshness indicator.

  Renders nothing unless the figure's `asOf` text parses to a date older than
  ~100 days, in which case it appends a faint "· may be stale" note. This is
  honesty, not an alarm: the figure stays visible, the reader is told its
  source may have been superseded (e.g. a newer earnings release exists).

  Props:
    asOf — the free-text asOf string from the data record (may be null)
*/
export default function StaleTag({ asOf }) {
  if (!isStale(asOf)) return null
  return (
    <span
      className="whitespace-nowrap italic text-ink-faint"
      title="This figure's source is over 100 days old — a newer release may exist. Verify before relying on it."
    >
      {' · may be stale'}
    </span>
  )
}
