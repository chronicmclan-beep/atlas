import { useMemo, useState } from 'react'
import { timeline, config, timelineCategories, eras, getCompany } from '../../lib/data.js'
import SectionHeader from '../common/SectionHeader.jsx'
import Filters from '../common/Filters.jsx'
import CompareToggle from '../common/CompareToggle.jsx'
import CompanyChip from '../common/CompanyChip.jsx'

/*
  Section 05 — Master Timeline.
  A horizontally scrollable hub of the buildout from timeline.json, grouped into
  eras (config.eras). Major events show by default; minor events are unlockable.
  Category filters (config.timelineCategories, with colors) narrow the view.
  Selecting an event opens a detail panel that lists the companies involved
  (which will become cross-links in Phase 4).

  Note: an event's `tier` here means major/minor prominence, not a source
  confidence tier — timeline events carry a `source` attribution instead, shown
  in the detail panel.
*/

const allEvents = [...timeline.events].sort((a, b) => a.date.localeCompare(b.date))
const eraKeys = Object.keys(eras).sort()

export default function TimelineHub({ section }) {
  const [selectedCats, setSelectedCats] = useState(config.timelineCategories.map((c) => c.id))
  const [density, setDensity] = useState('major') // 'major' | 'all'
  const [selectedId, setSelectedId] = useState(null)

  const showMinor = density === 'all'

  const visible = useMemo(
    () =>
      allEvents.filter(
        (e) => selectedCats.includes(e.category) && (showMinor || e.tier === 'major'),
      ),
    [selectedCats, showMinor],
  )

  const hiddenMinorCount = useMemo(
    () => allEvents.filter((e) => e.tier === 'minor' && selectedCats.includes(e.category)).length,
    [selectedCats],
  )

  const byEra = useMemo(() => {
    const map = {}
    for (const e of visible) (map[e.era] ||= []).push(e)
    return map
  }, [visible])

  const selectedEvent = selectedId
    ? allEvents.find((e) => e.date + e.title === selectedId) ?? null
    : null

  return (
    <section>
      <SectionHeader section={section} />

      <div className="mb-lg flex flex-wrap items-center justify-between gap-md">
        <Filters
          options={config.timelineCategories}
          selected={selectedCats}
          onChange={setSelectedCats}
          multi
          ariaLabel="Filter by category"
        />
        <CompareToggle
          value={density}
          onChange={setDensity}
          ariaLabel="Event density"
          options={[
            { id: 'major', label: 'Major only' },
            { id: 'all', label: `All events` },
          ]}
        />
      </div>

      {!showMinor && (
        <p className="mb-md text-caption text-ink-faint">
          Showing major events. {hiddenMinorCount} minor event
          {hiddenMinorCount === 1 ? '' : 's'} hidden — switch to “All events” to reveal them.
        </p>
      )}

      {/* Horizontal scrollable timeline */}
      <div className="scroll-x overflow-x-auto pb-md">
        <div className="flex min-w-min gap-xl">
          {eraKeys
            .filter((era) => byEra[era]?.length)
            .map((era) => (
              <div key={era} className="shrink-0">
                <div className="mb-md border-t-2 border-ink-soft pt-sm">
                  <div className="text-eyebrow uppercase text-ink-faint">{era}</div>
                  <div className="text-heading font-medium">{eras[era].name}</div>
                  <p className="mt-2xs max-w-[280px] text-label text-ink-faint">
                    {eras[era].headline}
                  </p>
                </div>
                <div className="flex items-stretch gap-md">
                  {byEra[era].map((e) => {
                    const id = e.date + e.title
                    return (
                      <EventCard
                        key={id}
                        event={e}
                        active={selectedId === id}
                        onSelect={() => setSelectedId((prev) => (prev === id ? null : id))}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      <EventDetail event={selectedEvent} />
    </section>
  )
}

function EventCard({ event, active, onSelect }) {
  const cat = timelineCategories[event.category]
  const isMajor = event.tier === 'major'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={
        'flex w-56 min-h-40 shrink-0 flex-col rounded-card border bg-surface p-lg text-left shadow-card transition-colors ' +
        (active ? 'border-transparent' : 'border-line hover:bg-surface-hover')
      }
      style={active ? { boxShadow: `inset 0 0 0 2px ${cat?.color ?? 'var(--ink)'}` } : undefined}
    >
      <div className="flex items-center gap-xs">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: cat?.color }}
        />
        <span className="text-label text-ink-faint">{event.displayDate}</span>
      </div>
      <div
        className={
          'mt-sm text-body ' + (isMajor ? 'font-medium text-ink' : 'text-ink-soft')
        }
      >
        {event.title}
      </div>
      {event.figure && (
        <div className="mt-auto pt-md">
          <span className="inline-block rounded-control bg-surface-raised px-xs py-0.5 text-caption font-medium text-ink-soft">
            {event.figure}
          </span>
        </div>
      )}
    </button>
  )
}

function EventDetail({ event }) {
  if (!event) {
    return (
      <p className="mt-lg text-body text-ink-faint">
        Select an event to read what happened and see the companies involved.
      </p>
    )
  }
  const cat = timelineCategories[event.category]
  return (
    <div
      className="mt-lg rounded-card border border-line bg-surface p-lg"
      style={{ boxShadow: `inset 3px 0 0 ${cat?.color ?? 'var(--ink)'}` }}
    >
      <div className="flex flex-wrap items-center gap-x-sm gap-y-2xs text-caption">
        <span className="text-ink-faint">{event.displayDate}</span>
        <span className="inline-flex items-center gap-2xs text-ink-soft">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: cat?.color }} />
          {cat?.label ?? event.category}
        </span>
        <span className="text-ink-faint">· {eras[event.era]?.name}</span>
      </div>

      <h2 className="mt-sm text-heading font-medium">{event.title}</h2>
      {event.figure && <div className="mt-2xs text-label text-ink-soft">{event.figure}</div>}

      <p className="mt-sm text-body text-ink-soft">{event.description}</p>
      {event.whyItMatters && (
        <p className="mt-xs text-body text-ink">
          <span className="font-medium">Why it matters: </span>
          {event.whyItMatters}
        </p>
      )}

      {event.companies?.length > 0 && (
        <div className="mt-lg">
          <div className="text-eyebrow uppercase text-ink-faint">Companies involved</div>
          <div className="mt-xs flex flex-wrap gap-xs">
            {event.companies.map((c) => (
              <CompanyChip key={c} name={getCompany(c)?.name ?? c} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-lg text-caption text-ink-faint">Source: {event.source}</p>
    </div>
  )
}
