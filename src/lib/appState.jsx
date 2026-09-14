import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { layers, findCompany } from './data.js'
import { companyDestinations } from './crosslinks.js'
import { DEFAULT_SECTION } from './sections.js'

/*
  Shared app state:
    - Active section (which of the six is showing) — lifted here so any deep
      component can navigate.
    - The "active company set" that the Layer Map sets when a layer is clicked.
    - A cross-link "focus" request: navigateToCompany() switches to the best
      section for a company and stashes a focus token; the target section picks
      it up via useCompanyFocus() and selects that company.
*/
const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION)
  const [activeLayerId, setActiveLayerId] = useState(null)
  const [focus, setFocus] = useState(null) // { ticker, at, id }

  const activeCompanies = useMemo(() => {
    const layer = layers.find((l) => l.id === activeLayerId)
    return layer ? layer.companies : []
  }, [activeLayerId])

  const selectLayer = useCallback((id) => {
    setActiveLayerId((prev) => (prev === id ? null : id))
  }, [])
  const clearSelection = useCallback(() => setActiveLayerId(null), [])

  const navigateSection = useCallback((sectionId) => setActiveSection(sectionId), [])

  // Jump to a company's best (or a preferred) destination section and focus it.
  const navigateToCompany = useCallback((tickerOrName, preferred) => {
    const company = findCompany(tickerOrName)
    if (!company) return
    const dests = companyDestinations(company.ticker)
    const dest =
      preferred && dests.some((d) => d.sectionId === preferred) ? preferred : dests[0]?.sectionId
    if (!dest) return
    setActiveSection(dest)
    setFocus((f) => ({ ticker: company.ticker, at: dest, id: (f?.id ?? 0) + 1 }))
  }, [])

  const clearFocus = useCallback(() => setFocus(null), [])

  const value = useMemo(
    () => ({
      activeSection,
      navigateSection,
      activeLayerId,
      activeCompanies,
      selectLayer,
      clearSelection,
      focus,
      navigateToCompany,
      clearFocus,
    }),
    [activeSection, navigateSection, activeLayerId, activeCompanies, selectLayer, clearSelection, focus, navigateToCompany, clearFocus],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider')
  return ctx
}

/*
  Target sections call this to consume a pending cross-link focus. When a
  navigateToCompany() lands on this section, onFocus(ticker) runs once and the
  focus token is cleared. onFocus should be stable (defined with useCallback or
  only using state setters).
*/
export function useCompanyFocus(sectionId, onFocus) {
  const { focus, clearFocus } = useAppState()
  useEffect(() => {
    if (focus && focus.at === sectionId) {
      onFocus(focus.ticker)
      clearFocus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.id])
}
