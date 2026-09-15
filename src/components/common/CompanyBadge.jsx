import { findCompany } from '../../lib/data.js'

/*
  CompanyBadge — the logo slot. Shows a real logo image when a company has one
  (companies.json `logo`), otherwise a clean colored monogram derived from the
  ticker, tinted in the company's own color. Real logo files can drop in later
  with no other changes. Purely decorative, so hidden from assistive tech.

  Props:
    name — a company ticker, name, or alias (resolved via companies.json)
    size — pixel size of the square (default 20)
*/
function hexToRgba(hex, alpha) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!m) return `rgba(138,136,130,${alpha})` // neutral fallback
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
  return `rgba(${r},${g},${b},${alpha})`
}

export default function CompanyBadge({ name, size = 20 }) {
  const company = findCompany(name)
  const monogram = String(name ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase()

  const boxStyle = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  }

  // Real logo (future): drops in when companies.json `logo` is populated.
  if (company?.logo) {
    return (
      <img
        src={company.logo}
        alt=""
        aria-hidden="true"
        className="shrink-0 rounded-control object-contain"
        style={boxStyle}
      />
    )
  }

  // Fallback: colored monogram in the company's own color (neutral if unknown).
  const resolved = Boolean(company)
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-control font-medium leading-none"
      style={{
        ...boxStyle,
        background: resolved ? hexToRgba(company.color, 0.16) : 'var(--surface-raised)',
        color: resolved ? company.color : 'var(--ink-faint)',
      }}
    >
      {monogram}
    </span>
  )
}
