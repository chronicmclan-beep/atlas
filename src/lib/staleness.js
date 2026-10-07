/*
  staleness.js — one place that decides whether a figure's `asOf` text is old.

  Atlas `asOf` strings are free text like:
    "ended Jan 25 2026 · 10-K filed Feb 25 2026"
    "ended Dec 27 2025 · Q4/FY release Feb 3 2026"
  The helper finds every "Mon D YYYY" date in the string, takes the latest
  (usually the filing/release date), and compares it against the threshold.

  Unparseable input -> not stale (fail quiet, never cry wolf).
*/

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

export function parseAsOfDate(asOf) {
  if (!asOf || typeof asOf !== 'string') return null
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/gi
  let m
  let best = null
  while ((m = re.exec(asOf)) !== null) {
    const d = new Date(Date.UTC(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]))
    if (!Number.isNaN(d.getTime()) && (!best || d > best)) best = d
  }
  return best
}

/* Days since the latest date in the asOf string, or null if unparseable. */
export function asOfAgeDays(asOf) {
  const d = parseAsOfDate(asOf)
  if (!d) return null
  return (Date.now() - d.getTime()) / 86400000
}

/* True when the figure's source is older than `thresholdDays` (default 100). */
export function isStale(asOf, thresholdDays = 100) {
  const age = asOfAgeDays(asOf)
  return age !== null && age > thresholdDays
}
