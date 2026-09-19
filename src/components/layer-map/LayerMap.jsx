import { layers } from '../../lib/data.js'
import { useAppState } from '../../lib/appState.jsx'
import SectionHeader from '../common/SectionHeader.jsx'
import CompanyChip from '../common/CompanyChip.jsx'
import LayerMapIcon from '../common/icons/LayerMapIcon.jsx'

/*
  Section 01 — Industries and Sectors.
  The nine layers of the AI supply chain as cards, read from layers.json.
  Clicking a layer sets the active company set (shared app state); the selected
  card is highlighted in its layer color and its companies surface in a detail
  panel. Clicking the active card again clears the selection.
*/
export default function LayerMap({ section }) {
  const { activeLayerId, selectLayer } = useAppState()
  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? null

  return (
    <section>
      <SectionHeader section={section} accent={section.color} icon={LayerMapIcon} />

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {layers.map((layer) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            active={layer.id === activeLayerId}
            onSelect={() => selectLayer(layer.id)}
          />
        ))}
      </div>

      <ActiveLayerPanel layer={activeLayer} />
    </section>
  )
}

function LayerCard({ layer, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={
        'flex h-full flex-col rounded-card border bg-surface p-lg text-left shadow-card transition-all ' +
        (active ? 'border-transparent' : 'border-line hover:border-line-strong hover:shadow-raised')
      }
      style={active ? { boxShadow: `inset 0 0 0 2px ${layer.color}` } : undefined}
    >
      <div className="flex items-center gap-xs">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: layer.color }}
        />
        <span className="text-caption tabular-nums text-ink-faint">{layer.num}</span>
      </div>
      <h2 className="mt-xs text-heading font-medium">{layer.name}</h2>
      <p className="mt-xs text-label text-ink-soft">{layer.desc}</p>
      <div className="mt-auto pt-md text-caption text-ink-faint">
        {layer.companies.length} {layer.companies.length === 1 ? 'company' : 'companies'}
      </div>
    </button>
  )
}

function ActiveLayerPanel({ layer }) {
  if (!layer) {
    return (
      <p className="mt-xl text-body text-ink-faint">
        Select a layer to see the companies that make up its active set.
      </p>
    )
  }

  return (
    <div
      className="mt-xl rounded-card border border-line bg-surface p-lg"
      style={{ boxShadow: `inset 3px 0 0 ${layer.color}, var(--shadow-sm)` }}
    >
      <div className="text-eyebrow uppercase text-ink-faint">Active company set</div>
      <h2 className="mt-2xs text-heading font-medium">{layer.name}</h2>
      <p className="mt-2xs text-body text-ink-soft">{layer.desc}</p>
      <div className="mt-md flex flex-wrap gap-xs">
        {layer.companies.map((name) => (
          <CompanyChip key={name} name={name} />
        ))}
      </div>
    </div>
  )
}
