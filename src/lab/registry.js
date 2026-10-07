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
import CompareFocus from './variants/CompareFocus.jsx'
import VariantStoryCards from './variants/VariantStoryCards.jsx'
import VariantDials from './variants/VariantDials.jsx'
import VariantArrowRace from './variants/VariantArrowRace.jsx'
import VariantTimeline from './variants/VariantTimeline.jsx'
import VariantVenn from './variants/VariantVenn.jsx'
import VariantPyramid from './variants/VariantPyramid.jsx'
import VariantDots from './variants/VariantDots.jsx'
import VariantDuel from './variants/VariantDuel.jsx'

export const EXPERIMENTS = [
  {
    id: 'compare-layout',
    title: 'Company Comparison layout',
    task: 'Find the calmest way to deliver comparison results. Two prototypes, same verified data: the Command Deck (slim company menu beside one big central stage — metric ribbon, large visual cards, expand-to-focus mode) and Focus (one metric at a time, rendered huge in its native visual, almost no chrome).',
    variants: [
      {
        id: 'command-deck',
        title: 'Command Deck',
        description:
          'Slim company menu + one big central stage: metric ribbon, large 2-up visual cards, expand-to-focus mode.',
        component: CompareCommandDeck,
      },
      {
        id: 'focus',
        title: 'Focus',
        description:
          'One metric at a time, huge, in its native visual — donut, gauges, trend, flow or scale. Minimal chrome, collapsible menu.',
        component: CompareFocus,
      },
    ],
  },
  {
    id: 'infographic-elements',
    title: 'Infographic elements',
    task: 'Eight infographic-style treatments of the same verified comparison data — story cards, dials, arrow races, timeline tapes, venn overlaps, pyramids, dot pictograms, and versus duels. Same numbers, different visual language.',
    variants: [
      {
        id: 'story-cards',
        title: 'Story cards',
        description: 'A flippable deck of designed cards — one headline metric per card, numbered 01–06, plain-English takeaway.',
        component: VariantStoryCards,
      },
      {
        id: 'dials',
        title: 'Dials',
        description: 'Clock-face radial dials, one per company — the needle shows the metric on a labeled scale.',
        component: VariantDials,
      },
      {
        id: 'arrow-race',
        title: 'Arrow race',
        description: 'Companies as chevron arrows racing across the stage — length is the value, arrows grow on change.',
        component: VariantArrowRace,
      },
      {
        id: 'timeline',
        title: 'Timeline tape',
        description: 'Quarterly revenue as a milestone timeline — one colored tape per company, 18 quarters of nodes.',
        component: VariantTimeline,
      },
      {
        id: 'venn',
        title: 'Venn overlap',
        description: 'Overlapping circles with area proportional to value — the overlap names the multiple between leaders.',
        component: VariantVenn,
      },
      {
        id: 'pyramid',
        title: 'Margin pyramid',
        description: 'One P&L as a stacked pyramid: revenue down through gross profit and operating income to net income.',
        component: VariantPyramid,
      },
      {
        id: 'dots',
        title: 'Dot pictograms',
        description: 'One dot equals a labeled unit of value — companies as rows of dots in their own colors.',
        component: VariantDots,
      },
      {
        id: 'duel',
        title: 'Versus duel',
        description: 'Sports-matchup card: two badges face off, the metric is the arena, numbers count up, leader glows.',
        component: VariantDuel,
      },
    ],
  },
]
