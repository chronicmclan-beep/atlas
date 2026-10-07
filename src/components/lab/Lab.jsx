import { useState } from 'react'
import { EXPERIMENTS } from '../../lab/registry.js'
import SectionHeader from '../common/SectionHeader.jsx'
import LabIcon from '../common/icons/LabIcon.jsx'

/*
  Section 09 — The Lab.

  The design sandbox: experiments render prototype layouts inside a
  clearly-marked sandbox frame. The Lab shares the Atlas design system
  but stays visually fenced off (dashed amber accents, LAB tag) so nobody
  mistakes a prototype for verified production content.

  Figures shown are live Atlas data — the *layout* is what's being
  tested. When the owner picks a winner, its component is promoted into
  the production section and the experiment is removed from the registry.

  The shell stays minimal by design: experiment/variant switchers only
  appear when the registry actually holds more than one of them.
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
            Design experiments — try the idea, pick the winner, it ships.
          </span>
        </div>
      </SectionHeader>

      {/* Single compact experimental strip */}
      <div
        className="flex items-center gap-sm rounded-card border border-dashed px-md py-xs"
        style={{ borderColor: LAB }}
      >
        <LabTag />
        <p className="text-caption text-ink-soft">
          Design experiment — figures are live Atlas data; the{' '}
          <span className="font-medium text-ink">layout</span> is what&apos;s
          being tested, not the numbers.
        </p>
      </div>

      {/* Slim experiment header — a picker only when there's more than one */}
      {EXPERIMENTS.length > 1 ? (
        <div className="mt-md flex flex-wrap gap-xs" role="group" aria-label="Experiments">
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

      <div className="mt-md flex flex-wrap items-baseline gap-x-sm gap-y-2xs">
        <h3 className="text-heading font-medium text-ink">{exp.title}</h3>
        <span className="text-caption text-ink-faint">{variant.title}</span>
      </div>
      <p className="mt-2xs max-w-2xl text-body text-ink-soft">
        {variant.description}
      </p>

      {/* Variant tabs only when there's more than one to choose from */}
      {exp.variants.length > 1 ? (
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
