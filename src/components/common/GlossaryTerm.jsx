import { useEffect, useId, useRef, useState } from 'react'
import { getDefinition } from '../../lib/data.js'

/*
  GlossaryTerm — powers tap-to-learn. Wraps a label; if that label has a
  definition in glossary.json, it renders as a button with a dotted underline
  that opens a small popover with the definition. If there's no definition,
  it renders the text plainly (no affordance), so callers can wrap any label
  unconditionally.

  The popover is position:fixed, anchored to the trigger and clamped to the
  viewport, so it never overflows the screen and is never clipped by an
  ancestor scroll container (e.g. the KPIs compare table's overflow-x-auto).

  Props:
    term  — the glossary key to look up (defaults to the text child)
    children — the visible text (defaults to `term`)
*/
const POPOVER_W = 256 // matches the former w-64

export default function GlossaryTerm({ term, children }) {
  const label = term ?? (typeof children === 'string' ? children : '')
  const definition = getDefinition(label)
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
      const EST_H = 160 // reserve enough height to keep the popover on-screen
      const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_W - 8))
      // Flip above the trigger when there isn't room below.
      const top =
        r.bottom + 6 + EST_H > window.innerHeight - 8
          ? Math.max(8, r.top - EST_H - 6)
          : r.bottom + 6
      setPos({ top, left })
    }
    place()
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', () => setOpen(false), { once: true, capture: true })
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // No definition — render plain text, no interactivity.
  if (!definition) return <>{children ?? label}</>

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="cursor-help border-b border-dotted border-ink-faint text-left decoration-dotted underline-offset-2 hover:border-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {children ?? label}
      </button>
      {open && pos && (
        <span
          id={panelId}
          role="tooltip"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_W, zIndex: 50 }}
          className="block rounded-control border border-line bg-surface p-sm text-label text-ink-soft shadow-raised"
        >
          <span className="mb-1 block font-medium text-ink">{label}</span>
          {definition}
        </span>
      )}
    </span>
  )
}
