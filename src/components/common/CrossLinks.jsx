import { useAppState } from '../../lib/appState.jsx'
import { companyDestinations } from '../../lib/crosslinks.js'

/*
  CrossLinks — inline "jump to this company elsewhere" links. Renders the
  company's available destination sections (KPIs / supply chain / financing),
  minus the one it's already shown in (`exclude`). Used in the graph inspectors
  and the KPI header.
*/
export default function CrossLinks({ ticker, exclude, className = '' }) {
  const { navigateToCompany } = useAppState()
  const dests = companyDestinations(ticker).filter((d) => d.sectionId !== exclude)
  if (dests.length === 0) return null

  return (
    <div className={'flex flex-wrap gap-x-3 gap-y-1 ' + className}>
      {dests.map((d) => (
        <button
          key={d.sectionId}
          type="button"
          onClick={() => navigateToCompany(ticker, d.sectionId)}
          className="text-caption text-accent hover:underline"
        >
          View in {d.label} ›
        </button>
      ))}
    </div>
  )
}
