import { useEffect, useId, useRef, useState } from 'react'
import { getDefinition } from '../../lib/data.js'

/*
  GlossaryTerm — powers tap-to-learn. Wraps a label; if that label has a
  definition in glossary.json, it renders as a button with a dotted underline
  that opens a small popover with the definition. If there's no definition,
  it renders the text plainly (no affordance), so callers can wrap any label
  unconditionally.

  Props:
    term  — the glossary key to look up (defaults to the text child)
    children — the visible text (defaults to `term`)
*/
export default function GlossaryTerm({ term, children }) {
  const label = term ?? (typeof children === 'string' ? children : '')
  const definition = getDefinition(label)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
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
      {open && (
        <span
          id={panelId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 block w-64 rounded-md border border-line bg-surface p-3 text-[0.8125rem] leading-relaxed text-ink-soft"
        >
          <span className="mb-1 block font-medium text-ink">{label}</span>
          {definition}
        </span>
      )}
    </span>
  )
}
