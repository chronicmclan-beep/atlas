import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { glossaryEntries, glossaryTypes } from '../../lib/data.js'
import { useGlossaryFocus } from '../../lib/appState.jsx'
import SectionHeader from '../common/SectionHeader.jsx'
import Filters from '../common/Filters.jsx'
import GlossaryIcon from '../common/icons/GlossaryIcon.jsx'

/*
  Section 07 — Glossary.
  A searchable, type-grouped reference library over glossary-full.json: terms &
  concepts, people & players, products & tech, and events & moments. Every
  tap-to-learn link elsewhere can deep-link here via navigateToGlossary(), which
  clears the filters, scrolls to the entry and briefly highlights it.
*/
const TYPE_IDS = glossaryTypes.map((t) => t.id)

export default function GlossarySection({ section }) {
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState(TYPE_IDS)
  const [focusedId, setFocusedId] = useState(null)
  const highlightTimer = useRef(null)

  // Deep-link: reveal + scroll to + highlight the requested entry.
  const onFocus = useCallback((entryId) => {
    setQuery('')
    setTypes(TYPE_IDS)
    setFocusedId(entryId)
  }, [])
  useGlossaryFocus(onFocus)

  useEffect(() => {
    if (!focusedId) return
    const el = document.getElementById(`glossary-entry-${focusedId}`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setFocusedId(null), 2200)
    return () => clearTimeout(highlightTimer.current)
  }, [focusedId])

  const q = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      glossaryEntries.filter(
        (e) =>
          types.includes(e.type) &&
          (!q || e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)),
      ),
    [types, q],
  )

  const grouped = useMemo(
    () =>
      glossaryTypes
        .map((t) => ({ type: t, items: visible.filter((e) => e.type === t.id) }))
        .filter((g) => g.items.length > 0),
    [visible],
  )

  return (
    <section>
      <SectionHeader section={section} accent={section.color} icon={GlossaryIcon} />

      {/* Search + type filters */}
      <div className="mb-lg flex flex-col gap-md">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms, players, products, moments…"
          aria-label="Search the glossary"
          className="w-full max-w-md rounded-control border border-line bg-surface px-sm py-xs text-body text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        <div className="flex flex-wrap items-center justify-between gap-md">
          <Filters
            options={glossaryTypes}
            selected={types}
            onChange={(next) => setTypes(next.length ? next : TYPE_IDS)}
            multi
            ariaLabel="Filter by type"
          />
          <span className="text-caption text-ink-faint">
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="text-body text-ink-faint">No entries match your search.</p>
      ) : (
        <div className="flex flex-col gap-2xl">
          {grouped.map(({ type, items }) => (
            <div key={type.id}>
              <h2 className="mb-md text-eyebrow uppercase text-ink-faint">
                {type.label} · {items.length}
              </h2>
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                {items.map((e) => (
                  <GlossaryEntry key={e.id} entry={e} focused={focusedId === e.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function GlossaryEntry({ entry, focused }) {
  return (
    <div
      id={`glossary-entry-${entry.id}`}
      className={
        'scroll-mt-xl rounded-card border bg-surface p-lg shadow-card transition-shadow ' +
        (focused ? 'border-accent ring-2 ring-accent' : 'border-line')
      }
    >
      <h3 className="text-heading font-medium text-ink">{entry.term}</h3>
      <p className="mt-xs text-body text-ink-soft">{entry.definition}</p>
      {entry.source && (
        <p className="mt-sm text-caption text-ink-faint">Source: {entry.source}</p>
      )}
    </div>
  )
}
