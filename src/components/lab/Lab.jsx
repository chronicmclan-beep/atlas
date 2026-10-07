import { useState } from 'react'
import { EXPERIMENTS } from '../../lab/registry.js'
import SectionHeader from '../common/SectionHeader.jsx'
import LabIcon from '../common/icons/LabIcon.jsx'

/*
  Section 09 — The Lab.

  The design sandbox: experiments render as switchable prototype variants
  inside a clearly-marked sandbox frame. The Lab shares the Atlas design
  system but is visually fenced off (dashed accents, LAB tags, prototype
  banner) so nobody mistakes a prototype for verified production content.

  Nothing here is verified production content — layouts are experiments,
  figures shown are live Atlas data rendered through experimental views.
  When the owner picks a winner, its component is promoted into the
  production section and the experiment is removed from the registry.
*/

const LAB = '#EF9F27'

function LabTag() {
  return (
    <span
      className="rounded-control border border-dashed px-xs py-2xs text-caption font-medium uppercase tracking-wide"
      style={{ color: LAB, borderColor: LAB }}
    >
      Lab
    </span>
  )
}

function PrototypeBanner({ variantTitle }) {
  return (
    <div
      className="rounded-card border-2 border-dashed px-md py-sm"
      style={{ borderColor: LAB }}
    >
      <div className="flex flex-wrap items-center gap-sm">
        <LabTag />
        <span className="text-label font-medium text-ink">
          Prototype — design experiment, not verified production content
        </span>
      </div>
      <p className="mt-2xs text-caption text-ink-soft">
        You are viewing <span className="font-medium text-ink">“{variantTitle}”</span>,
        one layout idea for the task below. Figures are live Atlas data shown
        through an experimental lens — the layout is what's being tested.
      </p>
    </div>
  )
}

export default function Lab({ section }) {
  const [expId, setExpId] = useState(EXPERIMENTS[0]?.id)
  const [variantId, setVariantId] = useState(null)

  const exp = EXPERIMENTS.find((e) => e.id === expId) ?? EXPERIMENTS[0]
  const variant =
    exp.variants.find((v) => v.id === variantId) ?? exp.variants[0]
  const Variant = variant.component

  return (
    <section aria-labelledby="section-title">
      <SectionHeader section={section} accent={section.color} icon={LabIcon}>
        <div className="mt-sm flex items-center gap-sm">
          <LabTag />
          <span className="text-caption text-ink-faint">
            Switchable prototypes — tap through, then pick the winner to promote.
          </span>
        </div>
      </SectionHeader>

      {/* Experiment picker — cards so the Lab scales past one experiment */}
      <div className="grid gap-sm md:grid-cols-2">
        {EXPERIMENTS.map((e) => {
          const active = e.id === exp.id
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setExpId(e.id)
                setVariantId(null)
              }}
              aria-pressed={active}
              className={
                'rounded-card border px-md py-sm text-left transition-colors ' +
                (active
                  ? 'border-line-strong bg-surface shadow-card'
                  : 'border-line bg-bg hover:bg-surface-raised')
              }
            >
              <div className="flex items-center gap-sm">
                <LabTag />
                <span className="text-body font-medium text-ink">{e.title}</span>
              </div>
              <p className="mt-xs text-caption text-ink-soft">{e.task}</p>
              <p className="mt-2xs text-caption text-ink-faint">
                {e.variants.length} variant{e.variants.length === 1 ? '' : 's'}
              </p>
            </button>
          )
        })}
      </div>

      {/* Variant switcher tabs */}
      <div className="mt-lg">
        <div className="text-eyebrow uppercase text-ink-faint">
          Variants — {exp.title}
        </div>
        <div className="mt-sm flex flex-wrap gap-sm" role="tablist" aria-label="Design variants">
          {exp.variants.map((v) => {
            const active = v.id === variant.id
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setVariantId(v.id)}
                className={
                  'rounded-control border px-md py-xs text-label transition-colors ' +
                  (active
                    ? 'font-medium text-ink shadow-card'
                    : 'border-line text-ink-soft hover:bg-surface-raised')
                }
                style={active ? { borderColor: LAB, background: 'var(--surface)' } : undefined}
              >
                {v.title}
              </button>
            )
          })}
        </div>
        <p className="mt-sm max-w-2xl text-body text-ink-soft">
          {variant.description}
        </p>
      </div>

      {/* Prototype banner + sandbox frame */}
      <div className="mt-md grid gap-sm">
        <PrototypeBanner variantTitle={variant.title} />
        <div
          key={variant.id}
          className="rounded-card border border-dashed border-line-strong bg-bg px-sm py-md md:px-md"
        >
          <Variant />
        </div>
      </div>

      <p className="mt-md max-w-2xl text-caption text-ink-faint">
        How promotion works: tell me which variant wins and it moves into the
        production section as the real layout — the experiment is then retired
        from the Lab.
      </p>
    </section>
  )
}
