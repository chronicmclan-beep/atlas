import { useState } from 'react'
import { SECTIONS } from './lib/sections.js'
import { AppStateProvider, useAppState } from './lib/appState.jsx'
import { SECTION_ICONS } from './components/common/icons/index.js'
import BrandMark from './components/common/BrandMark.jsx'
import LayerMap from './components/layer-map/LayerMap.jsx'
import CompanyKPIs from './components/kpis/CompanyKPIs.jsx'
import RevenueSegments from './components/revenue/RevenueSegments.jsx'
import SupplyChainMap from './components/supply-chain/SupplyChainMap.jsx'
import TimelineHub from './components/timeline/TimelineHub.jsx'
import FinancingWeb from './components/financing/FinancingWeb.jsx'
import GlossarySection from './components/glossary/GlossarySection.jsx'
import Compare from './components/compare/Compare.jsx'
import Lab from './components/lab/Lab.jsx'

/*
  App shell: navigation across the nine sections. Sections are wired in one at a
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
  glossary: GlossarySection,
  compare: Compare,
  lab: Lab,
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
  // Collapsible sidebar — desktop only, persisted. On mobile (<md) the nav
  // is a horizontal scroll row and always shows labels.
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem('atlas:nav-collapsed') === '1'
    } catch {
      return false
    }
  })
  const toggleNav = () => {
    setNavCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem('atlas:nav-collapsed', next ? '1' : '0')
      } catch {
        /* storage unavailable — collapse still works for the session */
      }
      return next
    })
  }
  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]
  const SectionComponent = SECTION_COMPONENTS[section.id]

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex max-w-[1840px] flex-col gap-0 md:flex-row">
        {/* Sidebar navigation */}
        <aside
          className={
            'border-b border-line transition-[width] duration-300 md:min-h-screen md:shrink-0 md:border-b-0 md:border-r ' +
            (navCollapsed ? 'md:w-[68px]' : 'md:w-64')
          }
        >
          {/* Product mark */}
          <div
            className={
              'flex items-center gap-sm border-b border-line px-md py-md ' +
              (navCollapsed ? 'md:justify-center md:px-xs' : '')
            }
          >
            <BrandMark />
            <div className={'leading-tight ' + (navCollapsed ? 'md:hidden' : '')}>
              <div className="text-eyebrow uppercase text-ink-faint">AI infrastructure</div>
              <div className="text-heading font-medium tracking-tight text-ink">Atlas</div>
            </div>
          </div>

          <nav className="px-xs py-sm">
            <ul className="flex flex-row flex-nowrap gap-2xs overflow-x-auto md:flex-col md:overflow-visible">
              {SECTIONS.map((s) => {
                const isActive = s.id === activeSection
                const Icon = SECTION_ICONS[s.id]
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => navigateSection(s.id)}
                      aria-current={isActive ? 'page' : undefined}
                      title={navCollapsed ? s.label : undefined}
                      className={
                        'flex w-full items-center gap-sm whitespace-nowrap rounded-control px-sm py-sm text-body transition-colors ' +
                        (navCollapsed ? 'md:justify-center md:px-xs ' : '') +
                        (isActive
                          ? 'bg-surface font-medium text-ink shadow-card'
                          : 'text-ink-soft hover:bg-surface-raised hover:text-ink')
                      }
                      style={{ borderLeft: `3px solid ${isActive ? s.color : 'transparent'}` }}
                    >
                      {/* Miniature section icon in place of the old 01–07
                          numerals. SVG scales losslessly, so it stays crisp at
                          26px; the tile paints in the section accent via
                          currentColor, exactly like the section headers. */}
                      <span
                        aria-hidden="true"
                        className="inline-flex h-[26px] w-[26px] shrink-0"
                        style={{ color: s.color }}
                      >
                        {Icon ? <Icon size={26} /> : null}
                      </span>
                      <span className={navCollapsed ? 'md:hidden' : ''}>{s.label}</span>
                      {s.experimental && (
                        <span
                          className={
                            (navCollapsed ? 'md:hidden ' : '') +
                            'rounded-full border border-dashed px-xs py-2xs text-caption uppercase tracking-wide'
                          }
                          style={{ color: s.color, borderColor: s.color }}
                        >
                          Experimental
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            {/* Collapse toggle — desktop only; mobile keeps the scroll row */}
            <button
              type="button"
              onClick={toggleNav}
              aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!navCollapsed}
              title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              className="mt-sm hidden w-full items-center justify-center rounded-control px-sm py-sm text-ink-soft transition-colors hover:bg-surface-raised hover:text-ink md:flex"
            >
              <span aria-hidden="true" className="text-body">
                {navCollapsed ? '›' : '‹'}
              </span>
            </button>
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
