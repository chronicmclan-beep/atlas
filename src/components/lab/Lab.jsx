import { useState } from 'react'
import { EXPERIMENTS } from '../../lab/registry.js'

/*
  Section 09 — The Lab.

  The design sandbox: experiments render prototype layouts inside a
  clearly-marked sandbox frame. The Lab shares the Atlas design system
  but stays visually fenced off (dashed amber accents) so nobody
  mistakes a prototype for verified production content.

  Figures shown are live Atlas data — the *layout* is what's being
  tested. When the owner picks a winner, its component is promoted into
  the production section and the experiment is removed from the registry.

  The shell stays minimal by design: no explainer chrome — the section
  opens directly on the experiment (variant tabs, then the variant).
  Experiment/variant switchers only appear when the registry actually
  holds more than one of them.
*/

const LAB = '#EF9F27'

export default function Lab() {
  const [expId, setExpId] = useState(EXPERIMENTS[0]?.id)
  const [variantId, setVariantId] = useState(null)

  const exp = EXPERIMENTS.find((e) => e.id === expId) ?? EXPERIMENTS[0]
  const variant =
    exp.variants.find((v) => v.id === variantId) ?? exp.variants[0]
  const Variant = variant.component

  return (
    <section aria-label="The Lab">
      {/* Slim experiment picker — only when there's more than one */}
      {EXPERIMENTS.length > 1 ? (
        <div className="flex flex-wrap gap-xs" role="group" aria-label="Experiments">
          {EXPERIMENTS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setExpId(e.id)
                setVariantId(null)
              }}
              aria-pressed={e.id === exp.id}
              className={
                'rounded-control border px-sm py-2xs text-label transition-colors ' +
                (e.id === exp.id
                  ? 'font-medium text-ink shadow-card'
                  : 'border-line text-ink-soft hover:bg-surface-raised')
              }
              style={e.id === exp.id ? { borderColor: LAB } : undefined}
            >
              {e.title}
            </button>
          ))}
        </div>
      ) : null}

      {/* Variant tabs only when there's more than one to choose from */}
      {exp.variants.length > 1 ? (
        <div className="flex flex-wrap gap-sm" role="tablist" aria-label="Design variants">
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
                style={active ? { borderColor: LAB } : undefined}
              >
                {v.title}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* The variant renders directly inside a light sandbox frame */}
      <div
        key={variant.id}
        className="mt-sm rounded-card border border-dashed border-line-strong bg-bg px-sm py-md md:px-md"
      >
        <Variant />
      </div>

      <p className="mt-md text-caption text-ink-faint">
        Like it? Say the word and it moves into the production section.
      </p>
    </section>
  )
}
