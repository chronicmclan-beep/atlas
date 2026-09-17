import SourceTag from './SourceTag.jsx'
import GlossaryTerm from './GlossaryTerm.jsx'

/*
  MetricCard — one figure, always shown with its source tier.

  Enforces two standing rules visually:
    - Every figure displays its source tier (SourceTag, bottom-left).
    - Committed items (realized === false) render differently from realized
      ones: a dashed border and a "Committed" marker, matching the spec's
      "committed = dashed" line semantics.

  A null value (e.g. market cap awaiting a live feed) renders as an em dash
  with its explanatory sub-text, never as a fabricated number.

  Props:
    metric — { label, value, sub, tier, negative?, realized? }
*/
export default function MetricCard({ metric }) {
  const { label, value, sub, tier, negative, realized } = metric
  const isCommitted = realized === false
  const hasValue = value !== null && value !== undefined

  return (
    <div
      className={
        'flex flex-col gap-sm rounded-card border bg-surface p-lg shadow-card ' +
        (isCommitted ? 'border-dashed border-line' : 'border-solid border-line')
      }
    >
      <div className="flex items-start justify-between gap-xs">
        <div className="text-label text-ink-soft">
          <GlossaryTerm term={label}>{label}</GlossaryTerm>
        </div>
        {isCommitted && (
          <span className="shrink-0 rounded-control border border-dashed border-ink-faint px-1.5 py-0.5 text-eyebrow uppercase text-ink-faint">
            Committed
          </span>
        )}
      </div>

      <div
        className={
          'text-data font-medium break-words ' +
          (hasValue ? (negative ? 'text-tier-estimated' : 'text-ink') : 'text-ink-faint')
        }
      >
        {hasValue ? value : '—'}
      </div>

      {sub && <div className="text-caption text-ink-faint">{sub}</div>}

      <div className="mt-2xs">
        <SourceTag tier={tier} />
      </div>
    </div>
  )
}
