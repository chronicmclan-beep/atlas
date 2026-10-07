/*
  Lab experiment registry — the single list of design experiments in
  Section 09 "The Lab".

  Each experiment:
    id       stable id
    title    owner-facing name
    task     the design question being tested (plain English)
    variants [{ id, title, description, component }]

  Variant contract (enforced by convention):
    - default export, no required props
    - self-contained: own pickers, own state, own layout
    - figures resolve ONLY through src/lib/compareMetrics.js — nothing
      hardcoded, nothing re-sourced
    - no banned vocabulary (buy/sell/undervalued/overvalued/cheap/
      expensive/should/recommend/target/poised/set to)

  Promote flow: the owner taps through variants in the Lab, picks a winner,
  and the winner's component is moved into the production section
  (e.g. src/components/compare/) and the experiment is removed here.
*/
import CompareRailCanvas from './variants/CompareRailCanvas.jsx'

export const EXPERIMENTS = [
  {
    id: 'compare-layout',
    title: 'Company Comparison layout',
    task: 'Find the best way to deliver comparison results. Section 08 currently stacks the pickers above the results — this prototype tries a different outcome layout with the same verified data: the pickers dock into a slim sidebar and the result canvas builds live.',
    variants: [
      {
        id: 'rail-canvas',
        title: 'Rail + live canvas',
        description:
          'Pickers dock into a slim collapsible sidebar; the entire main area becomes a live result canvas that updates as you tap.',
        component: CompareRailCanvas,
      },
    ],
  },
]
