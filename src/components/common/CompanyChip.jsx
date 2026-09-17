import { useEffect, useId, useRef, useState } from 'react'
import { findCompany } from '../../lib/data.js'
import { companyDestinations } from '../../lib/crosslinks.js'
import { useAppState } from '../../lib/appState.jsx'
import CompanyBadge from './CompanyBadge.jsx'

/*
  CompanyChip — renders a company reference. If the string resolves to a known
  company that has cross-link destinations (KPIs / supply chain / financing),
  the chip becomes a button that opens a small popover to jump there. Strings
  that don't resolve, or resolve but have no destination, render as a plain
  neutral chip.

  The popover is position:fixed, anchored to the chip and clamped to the
  viewport, so a chip near the right edge (common at phone width) never pushes
  its menu off-screen or triggers horizontal page scroll.

  Props:
    name — the company string as it appears in the data
*/
const POPOVER_W = 208 // matches the former w-52

export default function CompanyChip({ name }) {
  const company = findCompany(name)
  const { navigateToCompany } = useAppState()
  const dests = company ? companyDestinations(company.ticker) : []
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const wrapRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const place = () => {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const EST_H = 150 // reserve enough height to keep the menu on-screen
      const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_W - 8))
      // Flip above the chip when there isn't room below.
      const top =
        r.bottom + 6 + EST_H > window.innerHeight - 8
          ? Math.max(8, r.top - EST_H - 6)
          : r.bottom + 6
      setPos({ top, left })
    }
    place()
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
    }
  }, [open])

  const badge = <CompanyBadge name={name} size={16} />
  const chipClass =
    'inline-flex items-center gap-xs rounded-full border border-line py-1 pl-1 pr-sm text-caption text-ink-soft'

  // Plain, non-interactive chip.
  if (!company || dests.length === 0) {
    return (
      <span className={chipClass} title={company?.role ?? undefined}>
        {badge}
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
        className={chipClass + ' transition-colors hover:border-line-strong hover:bg-surface-hover hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'}
      >
        {badge}
        {name}
      </button>
      {open && pos && (
        <span
          id={panelId}
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_W, zIndex: 50 }}
          className="block rounded-control border border-line bg-surface p-xs text-label shadow-raised"
        >
          <span className="mb-1 block px-1 text-caption font-medium text-ink">{company.name}</span>
          {dests.map((d) => (
            <button
              key={d.sectionId}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigateToCompany(company.ticker, d.sectionId)
              }}
              className="block w-full rounded-control px-1 py-1 text-left text-caption text-accent hover:bg-surface-raised"
            >
              View in {d.label} ›
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
