/*
  SECTION_ICONS — one registry mapping section id → its icon component, shared
  by the sidebar navigation and any other place that needs the miniature mark.
  The icon components are resolution-independent SVG (80×80 viewBox, `size`
  prop, `currentColor` tile), so they stay crisp at any size — including the
  26px nav slot.
*/
import LayerMapIcon from './LayerMapIcon.jsx'
import KPIsIcon from './KPIsIcon.jsx'
import RevenueIcon from './RevenueIcon.jsx'
import SupplyChainIcon from './SupplyChainIcon.jsx'
import TimelineIcon from './TimelineIcon.jsx'
import FinancingIcon from './FinancingIcon.jsx'
import GlossaryIcon from './GlossaryIcon.jsx'

export const SECTION_ICONS = {
  'layer-map': LayerMapIcon,
  kpis: KPIsIcon,
  revenue: RevenueIcon,
  'supply-chain': SupplyChainIcon,
  timeline: TimelineIcon,
  financing: FinancingIcon,
  glossary: GlossaryIcon,
}
