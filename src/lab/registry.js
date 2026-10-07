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
import CompareCommandDeck from './variants/CompareCommandDeck.jsx'

export const EXPERIMENTS = [
  {
    id: 'compare-layout',
    title: 'Company Comparison layout',
    task: 'Find the best way to deliver comparison results. This prototype is the Command Deck: a slim company menu beside one big central stage — metric ribbon, large visual cards, and full-stage focus mode — all driven by the same verified data.',
    variants: [
      {
        id: 'command-deck',
        title: 'Command Deck',
        description:
          'Slim company menu + one big central stage: metric ribbon, large 2-up visual cards, expand-to-focus mode.',
        component: CompareCommandDeck,
      },
    ],
  },
]
