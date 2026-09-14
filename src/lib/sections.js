/*
  The six sections of the Atlas, in canonical order (per the build spec).
  The nav shell and, later, the router both read from this single list so
  section order and labels live in exactly one place.
*/
export const SECTIONS = [
  {
    id: 'layer-map',
    num: '01',
    label: 'Layer map',
    blurb: 'The nine layers of the AI supply chain, from raw materials to finished models.',
  },
  {
    id: 'kpis',
    num: '02',
    label: 'Company KPIs',
    blurb: 'Financials per company, with a compare lens and tap-to-learn definitions. Every metric shows its source tier.',
  },
  {
    id: 'revenue',
    num: '03',
    label: 'Revenue & segments',
    blurb: 'Quarterly revenue over time, with compare mode and an indexed view.',
  },
  {
    id: 'supply-chain',
    num: '04',
    label: 'Supply chain map',
    blurb: 'The interactive food-web of who supplies whom. Guided walk, then free explore.',
  },
  {
    id: 'timeline',
    num: '05',
    label: 'Master timeline',
    blurb: 'The living record of the buildout — eras, major and minor events, filters.',
  },
  {
    id: 'financing',
    num: '06',
    label: 'Financing web',
    blurb: 'Capital flows on top of the supply chain. Circular-loops view and full-web view.',
  },
]

export const DEFAULT_SECTION = SECTIONS[0].id
