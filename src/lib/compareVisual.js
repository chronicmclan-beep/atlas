/*
  compareVisual.js — presentation math for the Head-to-head section.

  The comparison dataset stores display strings (e.g. "~$5.7T (Oct 6, 2026)").
  These helpers derive honest scalar values for bar/dot/scale visuals at render
  time. They never invent data: unparseable values return null and the UI
  falls back to a text treatment. No figure is written back anywhere.
*/

/**
 * Extract the leading scalar from a display string.
 * Handles $, T/B/M/K suffixes, %, x multiples and unicode minus.
 * Returns null when no scalar is present.
 */
export function parseScalar(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.replace(/[−–—]/g, '-').replace(/,/g, '')
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  let v = parseFloat(m[0])
  const head = s.slice(0, m.index + m[0].length)
  const after = s.slice(m.index + m[0].length, m.index + m[0].length + 4)
  if (/\$/.test(head)) {
    if (/T/i.test(after)) v *= 1e12
    else if (/B/i.test(after)) v *= 1e9
    else if (/M/i.test(after)) v *= 1e6
    else if (/K/i.test(after)) v *= 1e3
  }
  return v
}

/**
 * Extract a [lo, hi] range from a price string like "~$25K–$35K" or "$1,999 – $249".
 * Single values return [v, v]. Returns null when nothing parses.
 */
export function parseRange(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.replace(/,/g, '')
  const out = []
  const re = /\$?\s*(\d+(?:\.\d+)?)\s*([KMBT])?/gi
  let m
  while ((m = re.exec(s))) {
    let v = parseFloat(m[1])
    const u = (m[2] || '').toUpperCase()
    if (u === 'T') v *= 1e12
    else if (u === 'B') v *= 1e9
    else if (u === 'M') v *= 1e6
    else if (u === 'K') v *= 1e3
    // Only count numbers that look like money (near a $ or K/M/B/T unit)
    const ctx = s.slice(Math.max(0, m.index - 2), m.index + m[0].length + 1)
    if (!/\$/.test(ctx) && !u) {
      if (out.length >= 2) break
      continue
    }
    out.push(v)
    if (out.length >= 2) break
  }
  if (out.length === 0) return null
  if (out.length === 1) return [out[0], out[0]]
  return [Math.min(out[0], out[1]), Math.max(out[0], out[1])]
}

/**
 * Build an SVG path for a sparkline through `values` in a w×h box.
 */
export function sparkPath(values, w, h, pad = 3) {
  if (!values || values.length < 2) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const stepX = (w - pad * 2) / (values.length - 1)
  return values
    .map((v, i) => {
      const x = (pad + i * stepX).toFixed(1)
      const y = (h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
}

/** Percent-share string like "89.6%" → 89.6 */
export function parseShare(str) {
  const v = parseScalar(str)
  return v == null ? 0 : v
}
