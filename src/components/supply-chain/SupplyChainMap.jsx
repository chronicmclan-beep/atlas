import { useCallback, useMemo, useState } from 'react'
import { supplyEdges, layers, getCompany, companyColor, supplyParticipants } from '../../lib/data.js'
import { useCompanyFocus } from '../../lib/appState.jsx'
import SectionHeader from '../common/SectionHeader.jsx'
import GuidedWalk from '../common/GuidedWalk.jsx'
import SourceTag from '../common/SourceTag.jsx'
import CrossLinks from '../common/CrossLinks.jsx'

/*
  Section 04 — Supply Chain Map.
  A custom SVG "food-web" of who physically supplies whom, from
  supply-edges.json (nodes resolved against companies.json). Companies are laid
  out in columns by layer (canonical layer order); edges are supplier -> customer
  curves with arrowheads. Two ways in:
    - Guided walk: steps through the six flow types in order, highlighting each.
    - Free explore: tap any company to isolate its links and read its details.
  Every relationship shows its source tier; lower-confidence (estimated) links
  are drawn dashed.
*/

const edges = supplyEdges.edges

// --- Layout constants ---
// Sized so the seven columns fill the content width next to the sidebar and the
// graph stands tall enough to use the vertical space (rather than a short strip).
const NODE_W = 128
const NODE_H = 48
const COL_GAP = 34
const ROW_GAP = 88
const PAD = 20
const HEADER_H = 36

// Guided-walk script: one step per flow type, in supply order.
const WALK_DEFS = [
  { type: 'equipment', title: 'Equipment makes the machines', body: 'ASML and Applied Materials build the tools fabs depend on — above all, EUV lithography.' },
  { type: 'foundry', title: 'The foundry fabricates', body: 'TSMC turns fabless designs into physical wafers, and packages them.' },
  { type: 'memory', title: 'Memory is the bottleneck', body: 'SK Hynix, Micron and Samsung supply the HBM stacked beside each accelerator.' },
  { type: 'systems', title: 'Chips become systems', body: 'Designers ship silicon to Dell, Supermicro and Arista to build servers, racks and networking.' },
  { type: 'compute', title: 'Systems deploy as compute', body: 'Hyperscalers and neoclouds buy the hardware and stand up data centers.' },
  { type: 'cloud', title: 'Compute serves the labs', body: 'Cloud providers deliver that compute to the model labs that consume it.' },
]

export default function SupplyChainMap({ section }) {
  const [selected, setSelected] = useState(null)
  const [walkActive, setWalkActive] = useState(true)
  const [walkKey, setWalkKey] = useState(0)

  // Only walk types that actually exist in the data, in defined order.
  const walkSteps = useMemo(() => {
    const present = new Set(edges.map((e) => e.type))
    return WALK_DEFS.filter((w) => present.has(w.type))
  }, [])
  const [walkType, setWalkType] = useState(walkSteps[0]?.type ?? null)

  // Cross-link: when navigated here for a company, select its node.
  const onFocus = useCallback((ticker) => {
    if (supplyParticipants.has(ticker)) {
      setWalkActive(false)
      setSelected(ticker)
    }
  }, [])
  useCompanyFocus('supply-chain', onFocus)

  // --- Compute node layout ---
  const { positions, columns, width, height } = useMemo(() => computeLayout(), [])

  // --- Determine what's highlighted (selection wins over walk) ---
  const highlight = useMemo(() => {
    if (selected) {
      const edgeIdx = new Set()
      const nodes = new Set([selected])
      edges.forEach((e, i) => {
        if (e.from === selected || e.to === selected) {
          edgeIdx.add(i)
          nodes.add(e.from)
          nodes.add(e.to)
        }
      })
      return { edgeIdx, nodes }
    }
    if (walkActive && walkType) {
      const edgeIdx = new Set()
      const nodes = new Set()
      edges.forEach((e, i) => {
        if (e.type === walkType) {
          edgeIdx.add(i)
          nodes.add(e.from)
          nodes.add(e.to)
        }
      })
      return { edgeIdx, nodes }
    }
    return null
  }, [selected, walkActive, walkType])

  function restartWalk() {
    setSelected(null)
    setWalkType(walkSteps[0]?.type ?? null)
    setWalkActive(true)
    setWalkKey((k) => k + 1)
  }

  return (
    <section>
      <SectionHeader section={section} accent={section.color} />

      <div className="flex flex-col gap-lg lg:flex-row">
        {/* Graph */}
        <div className="min-w-0 flex-1">
          <div className="scroll-x overflow-x-auto rounded-card border border-line bg-surface p-md">
            {/* Fill the available width (scaling up on wide screens); keep a
                readable minimum so it scrolls rather than shrinking on narrow ones. */}
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Supply chain food-web"
              onClick={() => setSelected(null)}
              style={{ width: '100%', height: 'auto', minWidth: width }}
            >
              <defs>
                <marker id="sc-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" />
                </marker>
                <marker id="sc-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink)" />
                </marker>
              </defs>

              {/* Column headers */}
              {columns.map((col, i) => (
                <text
                  key={col.layer.id}
                  x={colX(i)}
                  y={PAD + 16}
                  fontSize="13"
                  fill="var(--ink-faint)"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  <title>{col.layer.name}</title>
                  {col.layer.num} {shortLayer(col.layer.name)}
                </text>
              ))}

              {/* Edges */}
              {edges.map((e, i) => {
                const a = positions[e.from]
                const b = positions[e.to]
                if (!a || !b) return null
                const isActive = highlight?.edgeIdx.has(i)
                const dimmed = highlight && !isActive
                const dashed = e.tier === 'estimated'
                return (
                  <path
                    key={i}
                    d={edgePath(a, b)}
                    fill="none"
                    stroke={isActive ? companyColor(e.from) : 'var(--ink-faint)'}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeDasharray={dashed ? '6 5' : undefined}
                    strokeOpacity={dimmed ? 0.1 : isActive ? 0.9 : 0.4}
                    markerEnd={isActive ? 'url(#sc-arrow-active)' : 'url(#sc-arrow)'}
                  />
                )
              })}

              {/* Nodes */}
              {columns.map((col) =>
                col.tickers.map((t) => {
                  const p = positions[t]
                  const company = getCompany(t)
                  const dimmed = highlight && !highlight.nodes.has(t)
                  const isSelected = selected === t
                  return (
                    <g
                      key={t}
                      transform={`translate(${p.x},${p.y})`}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setSelected((prev) => (prev === t ? null : t))
                      }}
                      style={{ cursor: 'pointer', opacity: dimmed ? 0.3 : 1 }}
                    >
                      <rect
                        width={NODE_W}
                        height={NODE_H}
                        rx="8"
                        fill="var(--surface)"
                        stroke={isSelected ? company?.color ?? 'var(--ink)' : 'var(--line)'}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <circle cx="18" cy={NODE_H / 2} r="5" fill={company?.color ?? 'var(--ink-faint)'} />
                      <text x="36" y={NODE_H / 2 + 5} fontSize="16" fontWeight="500" fill="var(--ink)">
                        {t}
                      </text>
                    </g>
                  )
                }),
              )}
            </svg>
          </div>
          <p className="mt-sm text-caption text-ink-faint">{supplyEdges.note}</p>
        </div>

        {/* Side panel: guided walk + inspector */}
        <div className="lg:w-80 lg:shrink-0">
          {walkActive ? (
            <GuidedWalk
              key={walkKey}
              steps={walkSteps}
              onStep={(_, step) => {
                setSelected(null)
                setWalkType(step.type)
              }}
              onDone={() => {
                setWalkActive(false)
                setWalkType(null)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={restartWalk}
              className="rounded-control border border-line px-sm py-xs text-label text-ink-soft transition-colors hover:text-ink"
            >
              Restart guided walk
            </button>
          )}

          <div className="mt-lg">
            {selected ? (
              <CompanyInspector ticker={selected} onClear={() => setSelected(null)} />
            ) : (
              <p className="text-label text-ink-faint">
                {walkActive
                  ? 'Following the guided walk. Tap any company to inspect its links instead.'
                  : 'Tap any company to see who supplies it and who it supplies.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CompanyInspector({ ticker, onClear }) {
  const company = getCompany(ticker)
  const outgoing = edges.filter((e) => e.from === ticker)
  const incoming = edges.filter((e) => e.to === ticker)

  return (
    <div className="rounded-card border border-line bg-surface p-lg" style={{ boxShadow: `inset 3px 0 0 ${company?.color ?? 'var(--ink)'}` }}>
      <div className="flex items-start justify-between gap-xs">
        <div>
          <div className="text-heading font-medium" style={{ color: company?.color }}>
            {company?.name ?? ticker}
          </div>
          {company?.role && <p className="mt-2xs text-label text-ink-soft">{company.role}</p>}
        </div>
        <button type="button" onClick={onClear} className="text-caption text-ink-faint hover:text-ink">
          Clear
        </button>
      </div>

      <EdgeList title="Supplies to" items={outgoing} nameKey="to" empty="Nothing downstream in the data." />
      <EdgeList title="Supplied by" items={incoming} nameKey="from" empty="Nothing upstream in the data." />
      <CrossLinks ticker={ticker} exclude="supply-chain" className="mt-lg border-t border-line pt-sm" />
    </div>
  )
}

function EdgeList({ title, items, nameKey, empty }) {
  return (
    <div className="mt-lg">
      <div className="text-eyebrow uppercase text-ink-faint">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2xs text-caption text-ink-faint">{empty}</p>
      ) : (
        <ul className="mt-xs space-y-sm">
          {items.map((e, i) => {
            const other = getCompany(e[nameKey])
            return (
              <li key={i} className="text-label">
                <div className="flex items-center gap-xs">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: other?.color ?? 'var(--ink-faint)' }} />
                  <span className="font-medium">{other?.name ?? e[nameKey]}</span>
                  <SourceTag tier={e.tier} showLabel={false} />
                  {e.magnitude && <span className="text-caption text-ink-soft">{e.magnitude}</span>}
                </div>
                <div className="ml-md text-caption text-ink-faint">{e.product}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// --- Layout helpers ---

function colX(i) {
  return PAD + i * (NODE_W + COL_GAP)
}

function colHeight(n) {
  return n * NODE_H + (n - 1) * ROW_GAP
}

function shortLayer(name) {
  return name.split(/[,&]/)[0].trim()
}

function computeLayout() {
  const present = new Set()
  edges.forEach((e) => {
    present.add(e.from)
    present.add(e.to)
  })

  // Group participants by their primary layer, in canonical layer order.
  const byLayer = {}
  for (const t of present) {
    const c = getCompany(t)
    const lid = c?.layer ?? 'unknown'
    ;(byLayer[lid] ||= []).push(t)
  }
  const columns = layers
    .filter((l) => byLayer[l.id]?.length)
    .map((l) => ({ layer: l, tickers: byLayer[l.id] }))

  const maxNodes = Math.max(...columns.map((c) => c.tickers.length))
  const maxH = colHeight(maxNodes)

  const positions = {}
  columns.forEach((col, i) => {
    const ch = colHeight(col.tickers.length)
    const yStart = PAD + HEADER_H + (maxH - ch) / 2
    col.tickers.forEach((t, j) => {
      const x = colX(i)
      const y = yStart + j * (NODE_H + ROW_GAP)
      positions[t] = { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2, left: x, right: x + NODE_W }
    })
  })

  const width = colX(columns.length - 1) + NODE_W + PAD
  const height = PAD + HEADER_H + maxH + PAD
  return { positions, columns, width, height }
}

function edgePath(a, b) {
  const forward = b.cx >= a.cx
  const sx = forward ? a.right : a.left
  const ex = forward ? b.left : b.right
  const sy = a.cy
  const ey = b.cy
  const dx = Math.max(40, Math.abs(ex - sx) / 2)
  const c1x = forward ? sx + dx : sx - dx
  const c2x = forward ? ex - dx : ex + dx
  return `M${sx},${sy} C${c1x},${sy} ${c2x},${ey} ${ex},${ey}`
}
