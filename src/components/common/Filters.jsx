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
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => toggle(opt.id)}
            className={
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] transition-colors ' +
              (isActive
                ? 'border-ink/15 bg-surface-raised font-medium text-ink'
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
