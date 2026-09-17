import { useCallback, useMemo, useState } from 'react'
import { financing, getCompany, companyColor, getRealizedState, financingParticipants } from '../../lib/data.js'
import { useCompanyFocus } from '../../lib/appState.jsx'
import SectionHeader from '../common/SectionHeader.jsx'
import CompareToggle from '../common/CompareToggle.jsx'
import SourceTag from '../common/SourceTag.jsx'
import CrossLinks from '../common/CrossLinks.jsx'
import FinancingIcon from '../common/icons/FinancingIcon.jsx'

/*
  Section 06 — Financing Web.
  Capital flows from financing.json, drawn as a radial network (source ->
  recipient). Two views:
    - Circular loops: only loop:true edges — the circular-financing ties where a
      vendor invests in a customer that then buys its chips.
    - Full web: every capital flow.
  Realized flows are solid; committed (realized:false) flows are dashed, per the
  global line rule. Tap a node to inspect its capital in and out.
*/

const edges = financing.edges

// Loop-view accent (the circular-financing theme color). Theme-aware token so
// it brightens on dark and its soft fill adapts (see src/styles/tokens.css).
const LOOP_COLOR = 'var(--loop)'

const CENTER = { x: 340, y: 250 }
const RADIUS = 180
const NODE_W = 92
const NODE_H = 30
const WIDTH = 680
const HEIGHT = 500

export default function FinancingWeb({ section }) {
  const [view, setView] = useState('loops') // 'loops' | 'full'
  const [selected, setSelected] = useState(null)

  // Cross-link: when navigated here for a company, show the full web and select it.
  const onFocus = useCallback((ticker) => {
    if (financingParticipants.has(ticker)) {
      setView('full')
      setSelected(ticker)
    }
  }, [])
  useCompanyFocus('financing', onFocus)

  const visibleEdges = useMemo(
    () => (view === 'loops' ? edges.filter((e) => e.loop) : edges),
    [view],
  )

  // Radial layout over the participants of the current view.
  const positions = useMemo(() => {
    const present = []
    const seen = new Set()
    for (const e of visibleEdges) {
      for (const t of [e.from, e.to]) {
        if (!seen.has(t)) {
          seen.add(t)
          present.push(t)
        }
      }
    }
    const map = {}
    const n = present.length
    // Grow the ring with node count so adjacent boxes never overlap at the
    // corners (the full-web view has ~12 nodes). Stays within the fixed viewBox.
    const radius = n > 1 ? Math.max(RADIUS, (NODE_W + 16) / (2 * Math.sin(Math.PI / n))) : RADIUS
    present.forEach((t, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const cx = CENTER.x + radius * Math.cos(angle)
      const cy = CENTER.y + radius * Math.sin(angle)
      map[t] = { cx, cy }
    })
    return map
  }, [visibleEdges])

  const highlight = useMemo(() => {
    if (!selected) return null
    const idx = new Set()
    const nodes = new Set([selected])
    visibleEdges.forEach((e, i) => {
      if (e.from === selected || e.to === selected) {
        idx.add(i)
        nodes.add(e.from)
        nodes.add(e.to)
      }
    })
    return { idx, nodes }
  }, [selected, visibleEdges])

  const nodeList = Object.keys(positions)

  return (
    <section>
      <SectionHeader section={section} accent={section.color} icon={FinancingIcon} />

      <div className="mb-lg flex flex-wrap items-center gap-md">
        <CompareToggle
          value={view}
          onChange={(v) => {
            setView(v)
            setSelected(null)
          }}
          ariaLabel="Financing view"
          options={[
            { id: 'loops', label: 'Circular loops' },
            { id: 'full', label: 'Full web' },
          ]}
        />
        <Legend />
      </div>

      <div className="flex flex-col gap-lg lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="scroll-x overflow-x-auto rounded-card border border-line bg-surface p-sm">
            {/* Fill the available width (scaling the radial graph up on wide
                screens); keep a min-width floor so it scrolls rather than
                shrinking on narrow ones. */}
            <svg
              width={WIDTH}
              height={HEIGHT}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Financing ${view === 'loops' ? 'circular loops' : 'full web'}`}
              onClick={() => setSelected(null)}
              style={{ width: '100%', height: 'auto', minWidth: WIDTH }}
            >
              <defs>
                <marker id="fin-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" />
                </marker>
                <marker id="fin-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink)" />
                </marker>
              </defs>

              {/* Edges */}
              {visibleEdges.map((e, i) => {
                const a = positions[e.from]
                const b = positions[e.to]
                if (!a || !b) return null
                const isActive = highlight?.idx.has(i)
                const dimmed = highlight && !isActive
                const committed = e.realized === false
                const stroke = isActive
                  ? companyColor(e.from)
                  : e.loop
                    ? LOOP_COLOR
                    : 'var(--ink-faint)'
                return (
                  <g key={i} style={{ opacity: dimmed ? 0.12 : 1 }}>
                    <path
                      d={edgePath(a, b)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeDasharray={committed ? '6 5' : undefined}
                      strokeOpacity={isActive ? 0.95 : 0.55}
                      markerEnd={isActive ? 'url(#fin-arrow-active)' : 'url(#fin-arrow)'}
                    />
                    {isActive && e.amount && (
                      <text
                        {...edgeLabelPos(a, b)}
                        fontSize="12"
                        fill="var(--ink)"
                        textAnchor="middle"
                        stroke="var(--surface)"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                        paintOrder="stroke"
                      >
                        {/* Compact on-graph label; full amount stays in the hover
                            title and in the inspector panel. Keeps wide amount
                            strings from colliding with reciprocal labels/nodes. */}
                        <title>{e.amount}</title>
                        {shortAmount(e.amount)}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Nodes */}
              {nodeList.map((t) => {
                const p = positions[t]
                const company = getCompany(t)
                const dimmed = highlight && !highlight.nodes.has(t)
                const isSelected = selected === t
                return (
                  <g
                    key={t}
                    transform={`translate(${p.cx - NODE_W / 2},${p.cy - NODE_H / 2})`}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setSelected((prev) => (prev === t ? null : t))
                    }}
                    style={{ cursor: 'pointer', opacity: dimmed ? 0.3 : 1 }}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx="6"
                      fill="var(--surface)"
                      stroke={isSelected ? company?.color ?? 'var(--ink)' : 'var(--line)'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <circle cx="13" cy={NODE_H / 2} r="4" fill={company?.color ?? 'var(--ink-faint)'} />
                    <text x="24" y={NODE_H / 2 + 4} fontSize="13" fill="var(--ink)">
                      {t}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <p className="mt-sm text-caption text-ink-faint">{financing.note}</p>
          <p className="mt-2xs text-caption text-ink-faint">
            NVIDIA equity portfolio: {financing.context.nvidiaEquityPortfolio} ({financing.context.source})
          </p>
        </div>

        <div className="lg:w-80 lg:shrink-0">
          {selected ? (
            <FinancingInspector ticker={selected} onClear={() => setSelected(null)} />
          ) : (
            <p className="text-label text-ink-faint">
              Tap any company to see the capital flowing in and out.
              {view === 'loops' && ' These are the circular-financing ties — invest, then get paid back through purchases.'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-md text-caption text-ink-soft">
      <span className="inline-flex items-center gap-xs">
        <svg width="26" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="26" y2="4" stroke="var(--ink-soft)" strokeWidth="2" />
        </svg>
        Realized
      </span>
      <span className="inline-flex items-center gap-xs">
        <svg width="26" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="26" y2="4" stroke="var(--ink-soft)" strokeWidth="2" strokeDasharray="6 5" />
        </svg>
        Committed
      </span>
      <span className="inline-flex items-center gap-xs">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: LOOP_COLOR }} />
        Circular loop
      </span>
    </div>
  )
}

function FinancingInspector({ ticker, onClear }) {
  const company = getCompany(ticker)
  const out = edges.filter((e) => e.from === ticker)
  const inn = edges.filter((e) => e.to === ticker)

  return (
    <div className="rounded-card border border-line bg-surface p-lg" style={{ boxShadow: `inset 3px 0 0 ${company?.color ?? 'var(--ink)'}` }}>
      <div className="flex items-start justify-between gap-xs">
        <div className="text-heading font-medium" style={{ color: company?.color }}>
          {company?.name ?? ticker}
        </div>
        <button type="button" onClick={onClear} className="text-caption text-ink-faint hover:text-ink">
          Clear
        </button>
      </div>
      {company?.role && <p className="mt-2xs text-label text-ink-soft">{company.role}</p>}

      <FlowList title="Capital out" items={out} nameKey="to" empty="No outbound capital in the data." />
      <FlowList title="Capital in" items={inn} nameKey="from" empty="No inbound capital in the data." />
      <CrossLinks ticker={ticker} exclude="financing" className="mt-lg border-t border-line pt-sm" />
    </div>
  )
}

function FlowList({ title, items, nameKey, empty }) {
  return (
    <div className="mt-lg">
      <div className="text-eyebrow uppercase text-ink-faint">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2xs text-caption text-ink-faint">{empty}</p>
      ) : (
        <ul className="mt-xs space-y-md">
          {items.map((e, i) => {
            const other = getCompany(e[nameKey])
            const committed = e.realized === false
            const rstate = getRealizedState(e.realized)
            return (
              <li key={i} className="text-label">
                <div className="flex flex-wrap items-center gap-xs">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: other?.color ?? 'var(--ink-faint)' }} />
                  <span className="font-medium">{other?.name ?? e[nameKey]}</span>
                  {e.loop && (
                    <span className="rounded-control px-1 text-eyebrow font-medium uppercase" style={{ color: LOOP_COLOR, background: 'var(--loop-soft)' }}>
                      loop
                    </span>
                  )}
                  <SourceTag tier={e.tier} showLabel={false} />
                </div>
                <div className="ml-md mt-2xs flex flex-wrap items-center gap-x-sm text-caption text-ink-soft">
                  <span className="font-medium text-ink">{e.amount}</span>
                  <span className="text-ink-faint">{e.type}</span>
                  <span
                    className={
                      'rounded-control px-1.5 py-0.5 text-eyebrow uppercase ' +
                      (committed
                        ? 'border border-dashed border-ink-faint text-ink-faint'
                        : 'bg-surface-raised text-ink-soft')
                    }
                    title={rstate?.note}
                  >
                    {rstate?.label ?? (committed ? 'Committed' : 'Realized')}
                  </span>
                  <span className="text-ink-faint">{e.asOf}</span>
                </div>
                {e.note && <div className="ml-md mt-2xs text-caption text-ink-faint">{e.note}</div>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Compact form of an edge amount for the on-graph label so wide strings don't
// collide; the full text remains in the node inspector and the hover title.
function shortAmount(amount) {
  return amount.length > 12 ? amount.slice(0, 11) + '…' : amount
}

// --- Geometry ---

function trimmed(a, b) {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  // Clamp the end-trim so short edges don't invert — keeps the label between
  // the two trimmed endpoints and clear of the node boxes.
  const r = Math.min(50, len * 0.4)
  return {
    sx: a.cx + ux * r,
    sy: a.cy + uy * r,
    ex: b.cx - ux * r,
    ey: b.cy - uy * r,
    px: -uy,
    py: ux,
  }
}

function edgePath(a, b) {
  const { sx, sy, ex, ey, px, py } = trimmed(a, b)
  const off = 26
  const cpx = (sx + ex) / 2 + px * off
  const cpy = (sy + ey) / 2 + py * off
  return `M${sx},${sy} Q${cpx},${cpy} ${ex},${ey}`
}

function edgeLabelPos(a, b) {
  const { sx, sy, ex, ey, px, py } = trimmed(a, b)
  const off = 26
  // Bias toward the SOURCE end (t≈0.32) and offset perpendicular. Because the
  // perpendicular (px,py) flips sign between a reciprocal pair's two directions,
  // their labels ride to opposite sides and don't collide at the midpoint. The
  // surface halo on the <text> keeps any short-edge label readable over a node.
  const t = 0.32
  const mx = sx + (ex - sx) * t + px * off * 1.35
  const my = sy + (ey - sy) * t + py * off * 1.35
  return { x: mx, y: my - 3 }
}
