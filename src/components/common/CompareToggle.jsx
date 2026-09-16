/*
  CompareToggle — a small segmented control. Generic on purpose: the KPIs and
  Revenue sections both need a single/compare (and indexed) switch, so this
  takes an options list rather than hardcoding modes.

  Props:
    options  — [{ id, label }]
    value    — active option id
    onChange — (id) => void
    ariaLabel — accessible label for the group
*/
export default function CompareToggle({ options, value, onChange, ariaLabel = 'View mode' }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-control border border-line bg-surface-raised p-0.5"
    >
      {options.map((opt) => {
        const isActive = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={
              'rounded-control px-sm py-2xs text-label transition-colors ' +
              (isActive
                ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--line)]'
                : 'text-ink-soft hover:text-ink')
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
