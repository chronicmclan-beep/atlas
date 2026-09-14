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

function AppShell() {
  const { activeSection, navigateSection } = useAppState()
  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]
  const SectionComponent = SECTION_COMPONENTS[section.id]

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex max-w-[1840px] flex-col gap-0 md:flex-row">
        {/* Sidebar navigation */}
        <aside className="border-b border-line md:min-h-screen md:w-52 md:shrink-0 md:border-b-0 md:border-r">
          <div className="px-md pb-sm pt-md md:pb-md">
            <div className="text-eyebrow uppercase text-ink-faint">AI infrastructure</div>
            <div className="mt-2xs text-heading font-medium">Atlas</div>
          </div>

          <nav className="px-xs pb-sm md:pb-md">
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
                        'flex w-full items-baseline gap-2 whitespace-nowrap rounded-control px-sm py-xs text-label transition-colors ' +
                        (isActive
                          ? 'bg-surface-raised font-medium text-ink'
                          : 'text-ink-soft hover:bg-surface-raised hover:text-ink')
                      }
                    >
                      <span className="text-caption tabular-nums text-ink-faint">{s.num}</span>
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
      <div className="text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">
        Section {section.num}
      </div>
      <h1 id="section-title" className="mt-1 text-2xl font-medium leading-tight">
        {section.label}
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
        {section.blurb}
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-line px-6 py-16 text-center">
        <p className="text-sm text-ink-faint">
          This section is not built yet — coming in a later phase.
        </p>
      </div>
    </section>
  )
}
