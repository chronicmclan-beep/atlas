/*
  The six sections of the Atlas, in canonical order (per the build spec).
  The nav shell and, later, the router both read from this single list so
  section order and labels live in exactly one place.

  `color` is each section's accent, drawn from the existing layer/category
  palette so the set stays cohesive. Used sparingly — e.g. the active nav cue.
*/
export const SECTIONS = [
  {
    id: 'layer-map',
    num: '01',
    label: 'Industries and Sectors',
    color: '#639922',
    blurb: 'The nine layers of the AI supply chain, from raw materials to finished models.',
  },
  {
    id: 'kpis',
    num: '02',
    label: 'Company KPIs',
    color: '#0091D5',
    blurb: 'Financials per company, with a compare lens and tap-to-learn definitions. Every metric shows its source tier.',
  },
  {
    id: 'revenue',
    num: '03',
    label: 'Revenue & segments',
    color: '#76B900',
    blurb: 'Quarterly revenue over time, with compare mode and an indexed view.',
  },
  {
    id: 'supply-chain',
    num: '04',
    label: 'Supply chain map',
    color: '#BA7517',
    blurb: 'The interactive food-web of who supplies whom. Guided walk, then free explore.',
  },
  {
    id: 'timeline',
    num: '05',
    label: 'Master timeline',
    color: '#378ADD',
    blurb: 'The living record of the buildout — eras, major and minor events, filters.',
  },
  {
    id: 'financing',
    num: '06',
    label: 'Financing web',
    color: '#D4537E',
    blurb: 'Capital flows as a tapered chord — line color is the investor, taper is the direction.',
  },
  {
    id: 'glossary',
    num: '07',
    label: 'Glossary',
    color: '#7F77DD',
    blurb: 'A reference library of every term, player, product and market moment in the Atlas — searchable and grouped by type.',
  },
]

export const DEFAULT_SECTION = SECTIONS[0].id
