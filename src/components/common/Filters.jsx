/*
  Filters — a reusable set of toggle chips. Used later for timeline categories
  and major/minor tiers, and anywhere a multi- or single-select filter is
  needed. Each option may carry a color (e.g. timeline category colors from
  config.json), shown as a leading dot.

  Props:
    options  — [{ id, label, color? }]
    selected — array of selected ids
    onChange — (nextSelectedIds[]) => void
    multi    — allow multiple (default true); false = single-select
*/
export default function Filters({ options, selected, onChange, multi = true, ariaLabel = 'Filters' }) {
  function toggle(id) {
    if (multi) {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
    } else {
      onChange([id])
    }
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-xs">
      {options.map((opt) => {
        const isActive = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => toggle(opt.id)}
            className={
              'inline-flex items-center gap-xs rounded-pill border px-sm py-2xs text-caption transition-colors ' +
              (isActive
                ? 'border-line-strong bg-surface-raised font-medium text-ink'
                : 'border-line text-ink-soft hover:text-ink')
            }
          >
            {opt.color && (
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: opt.color, opacity: isActive ? 1 : 0.5 }}
              />
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
