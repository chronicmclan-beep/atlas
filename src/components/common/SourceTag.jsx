import { getTier } from '../../lib/data.js'

/*
  SourceTag — the shared visual language for confidence.
  Renders a small chip colored by source tier (reported / disclosed /
  estimated / inferred, plus the synthesized 'live'). The tier's note is
  exposed as a native tooltip and to assistive tech.

  Props:
    tier  — tier id string
    showDot   — show the leading color dot (default true)
    showLabel — show the tier label text (default true)
*/
export default function SourceTag({ tier, showDot = true, showLabel = true, className = '' }) {
  const t = getTier(tier)
  return (
    <span
      className={`tier-chip ${className}`}
      data-tier={t.id}
      title={t.note}
      aria-label={`Source: ${t.label} — ${t.note}`}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'currentColor' }}
        />
      )}
      {showLabel && <span>{t.label}</span>}
    </span>
  )
}
