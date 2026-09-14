import { useEffect, useId, useRef, useState } from 'react'
import { findCompany } from '../../lib/data.js'
import { companyDestinations } from '../../lib/crosslinks.js'
import { useAppState } from '../../lib/appState.jsx'

/*
  CompanyChip — renders a company reference. If the string resolves to a known
  company that has cross-link destinations (KPIs / supply chain / financing),
  the chip becomes a button that opens a small popover to jump there — this is
  the cross-linking surface for company references in the Layer Map and Timeline.
  Strings that don't resolve, or resolve but have no destination, render as a
  plain neutral chip.

  Props:
    name — the company string as it appears in the data
*/
export default function CompanyChip({ name }) {
  const company = findCompany(name)
  const { navigateToCompany } = useAppState()
  const dests = company ? companyDestinations(company.ticker) : []
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const dot = (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: company ? company.color : 'var(--line)' }}
    />
  )
  const chipClass =
    'inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.75rem] text-ink-soft'

  // Plain, non-interactive chip.
  if (!company || dests.length === 0) {
    return (
      <span className={chipClass} title={company?.role ?? undefined}>
        {dot}
        {name}
      </span>
    )
  }

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={company.role ?? undefined}
        className={chipClass + ' transition-colors hover:border-ink/25 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'}
      >
        {dot}
        {name}
      </button>
      {open && (
        <span
          id={panelId}
          role="menu"
          className="absolute left-0 top-full z-20 mt-1.5 block w-52 rounded-md border border-line bg-surface p-2 text-sm"
        >
          <span className="mb-1 block px-1 text-xs font-medium text-ink">{company.name}</span>
          {dests.map((d) => (
            <button
              key={d.sectionId}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigateToCompany(company.ticker, d.sectionId)
              }}
              className="block w-full rounded px-1 py-1 text-left text-xs text-accent hover:bg-surface-raised"
            >
              View in {d.label} ›
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
