import { useState } from 'react'

/*
  GuidedWalk — a small stepper for guided tours (the supply-chain "guided walk
  then free explore", and reusable elsewhere). Manages its own step index and
  exposes the current step's content plus Back/Next controls and progress.

  Props:
    steps    — [{ title, body }]  (body may be a string or a node)
    onStep   — optional (index, step) => void, fired on change
    onDone   — optional () => void, fired when finishing the last step
*/
export default function GuidedWalk({ steps, onStep, onDone }) {
  const [i, setI] = useState(0)
  if (!steps || steps.length === 0) return null

  const step = steps[i]
  const isFirst = i === 0
  const isLast = i === steps.length - 1

  function go(next) {
    const clamped = Math.max(0, Math.min(steps.length - 1, next))
    setI(clamped)
    onStep?.(clamped, steps[clamped])
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-faint">
          Step {i + 1} of {steps.length}
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className="h-1 w-4 rounded-full transition-colors"
              style={{ background: idx === i ? 'var(--ink)' : 'var(--line)' }}
            />
          ))}
        </div>
      </div>

      <h3 className="mt-3 text-base font-medium leading-snug">{step.title}</h3>
      {step.body && <div className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</div>}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={isFirst}
          className="rounded-md border border-line px-3 py-1 text-sm text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="rounded-md bg-ink px-3 py-1 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go(i + 1)}
            className="rounded-md bg-ink px-3 py-1 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
