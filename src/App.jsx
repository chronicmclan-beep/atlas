import { SECTIONS } from './lib/sections.js'
import { AppStateProvider, useAppState } from './lib/appState.jsx'
import LayerMap from './components/layer-map/LayerMap.jsx'
import CompanyKPIs from './components/kpis/CompanyKPIs.jsx'
import RevenueSegments from './components/revenue/RevenueSegments.jsx'
import SupplyChainMap from './components/supply-chain/SupplyChainMap.jsx'
import TimelineHub from './components/timeline/TimelineHub.jsx'
import FinancingWeb from './components/financing/FinancingWeb.jsx'

/*
  App shell: navigation across the six sections. Sections are wired in one at a
  time (Phase 3) via the SECTION_COMPONENTS registry; any section without a
  registered component still shows the placeholder.
*/
const SECTION_COMPONENTS = {
  'layer-map': LayerMap,
  kpis: CompanyKPIs,
  revenue: RevenueSegments,
  'supply-chain': SupplyChainMap,
  timeline: TimelineHub,
  financing: FinancingWeb,
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  )
}

/*
  Product mark: a monochrome "strata" glyph — stacked layers fading downward,
  echoing the nine-layer supply chain the Atlas maps. Restrained on purpose.
*/
function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
      {/* Tile uses --ink and lines use --surface so the mark inverts cleanly
          in dark mode (dark tile + light lines → light tile + dark lines). */}
      <rect width="34" height="34" rx="9" fill="var(--ink)" />
      <rect x="9" y="10" width="16" height="2.4" rx="1.2" fill="var(--surface)" opacity="0.92" />
      <rect x="9" y="15.8" width="16" height="2.4" rx="1.2" fill="var(--surface)" opacity="0.6" />
      <rect x="9" y="21.6" width="16" height="2.4" rx="1.2" fill="var(--surface)" opacity="0.34" />
    </svg>
  )
}

function AppShell() {
  const { activeSection, navigateSection } = useAppState()
  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]
  const SectionComponent = SECTION_COMPONENTS[section.id]

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex max-w-[1840px] flex-col gap-0 md:flex-row">
        {/* Sidebar navigation */}
        <aside className="border-b border-line md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          {/* Product mark */}
          <div className="flex items-center gap-sm border-b border-line px-md py-md">
            <BrandMark />
            <div className="leading-tight">
              <div className="text-eyebrow uppercase text-ink-faint">AI infrastructure</div>
              <div className="text-heading font-medium tracking-tight text-ink">Atlas</div>
            </div>
          </div>

          <nav className="px-xs py-sm">
            <ul className="flex flex-row flex-nowrap gap-2xs overflow-x-auto md:flex-col md:overflow-visible">
              {SECTIONS.map((s) => {
                const isActive = s.id === activeSection
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => navigateSection(s.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        'flex w-full items-center gap-sm whitespace-nowrap rounded-control px-sm py-sm text-body transition-colors ' +
                        (isActive
                          ? 'bg-surface font-medium text-ink shadow-card'
                          : 'text-ink-soft hover:bg-surface-raised hover:text-ink')
                      }
                      style={{ borderLeft: `3px solid ${isActive ? s.color : 'transparent'}` }}
                    >
                      <span
                        className="text-label tabular-nums"
                        style={{ color: isActive ? s.color : 'var(--ink-faint)' }}
                      >
                        {s.num}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content — real section if wired, else placeholder */}
        <main className="min-w-0 flex-1 px-lg py-xl md:px-xl">
          {SectionComponent ? (
            <SectionComponent section={section} />
          ) : (
            <SectionPlaceholder section={section} />
          )}
        </main>
      </div>
    </div>
  )
}

function SectionPlaceholder({ section }) {
  return (
    <section aria-labelledby="section-title" className="max-w-2xl">
      <div className="text-eyebrow uppercase text-ink-faint">Section {section.num}</div>
      <h1 id="section-title" className="mt-2xs text-title font-medium">
        {section.label}
      </h1>
      <p className="mt-sm text-body text-ink-soft">{section.blurb}</p>

      <div className="mt-xl rounded-card border border-dashed border-line px-lg py-2xl text-center">
        <p className="text-body text-ink-faint">
          This section is not built yet — coming in a later phase.
        </p>
      </div>
    </section>
  )
}
