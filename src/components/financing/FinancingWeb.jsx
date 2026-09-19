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
  Capital flows from financing.json, drawn as a tapered chord diagram:
    - each arc segment is a participant, in its Atlas company color
    - each flow is a tapered band: THICK at the investor, narrowing toward
      the recipient — direction without arrowheads
    - band width scales with the square root of the disclosed $ amount;
      unquantified flows render at a minimum width and never show a number
    - solid = realized, faded = committed (announced, not booked)
  Views: all flows / circular loops only / straight investments only.
  Tap a flow for its terms; tap a company arc for its capital in and out.
*/

const edges = financing.edges

const CX = 360
const CY = 360
const R_OUT = 300
const R_IN = 272
const GAP = 0.045
const SIZE = 720
const ENTITY_ORDER = ['NVDA', 'OpenAI', 'CRWV', 'AMD', 'AVGO', 'Anthropic', 'MSFT', 'SoftBank', 'AMZN', 'GOOGL', 'INTC', 'US']
// Layout-only minimum weight for flows with no disclosed $ figure. Never
// displayed as an amount — unquantified stays unquantified per the data rules.
const MIN_WEIGHT = 3

// "$100B" -> 100, "~$13B+" -> 13, "~10% / $8.9B" -> 8.9, "GPU purchases" -> null
function parseBillions(amount) {
  const m = /~?\$([\d.]+)\s*B/.exec(amount ?? '')
  return m ? parseFloat(m[1]) : null
}

// Compact pill text drawn from the verified amount string — never invented.
function pillLabel(amount) {
  const m = /(~?\$[\d.]+B\+?)( ?cap)?/.exec(amount ?? '')
  return m ? (m[1] + (m[2] ?? '')).trim() : amount
}

// --- Chord geometry (quadratic-bezier ribbon, tapered source -> target) ---

function arcMid(span, r) {
  const a = (span[0] + span[1]) / 2
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

function taperPath(sa, ta, wSrc, wTgt, n = 28) {
  const r = R_IN - 8
  const p0 = arcMid(sa, r)
  const p1 = arcMid(ta, r)
  const L = []
  const R = []
  for (let k = 0; k <= n; k++) {
    const t = k / n
    const u = 1 - t
    const x = u * u * p0[0] + 2 * u * t * CX + t * t * p1[0]
    const y = u * u * p0[1] + 2 * u * t * CY + t * t * p1[1]
    const dx = 2 * u * (CX - p0[0]) + 2 * t * (p1[0] - CX)
    const dy = 2 * u * (CY - p0[1]) + 2 * t * (p1[1] - CY)
    const m = Math.hypot(dx, dy) || 1
    const hw = (wSrc * u + wTgt * t) / 2
    L.push(`${(x + (-dy / m) * hw).toFixed(1)},${(y + (dx / m) * hw).toFixed(1)}`)
    R.push(`${(x - (-dy / m) * hw).toFixed(1)},${(y - (dx / m) * hw).toFixed(1)}`)
  }
  return `M${L.join(' L')} L${R.reverse().join(' L')} Z`
}

function curvePoint(p0, p1, t) {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * CX + t * t * p1[0], u * u * p0[1] + 2 * u * t * CY + t * t * p1[1]]
}

function curveAngle(p0, p1, t) {
  const u = 1 - t
  const dx = 2 * u * (CX - p0[0]) + 2 * t * (p1[0] - CX)
  const dy = 2 * u * (CY - p0[1]) + 2 * t * (p1[1] - CY)
  let r = (Math.atan2(dy, dx) * 180) / Math.PI
  const mod = ((r % 360) + 360) % 360
  if (mod > 90 && mod < 270) r += 180
  return ((r + 180) % 360) - 180
}

function arcPath(a0, a1) {
  const p = (a, r) => [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  const [x0, y0] = p(a0, R_OUT)
  const [x1, y1] = p(a1, R_OUT)
  const [x2, y2] = p(a1, R_IN)
  const [x3, y3] = p(a0, R_IN)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return (
    `M${x0.toFixed(1)},${y0.toFixed(1)} A${R_OUT},${R_OUT} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} ` +
    `L${x2.toFixed(1)},${y2.toFixed(1)} A${R_IN},${R_IN} 0 ${large} 0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`
  )
}

export default function FinancingWeb({ section }) {
  const [view, setView] = useState('all') // 'all' | 'loops' | 'straight'
  const [selected, setSelected] = useState(null) // { kind: 'flow', index } | { kind: 'node', ticker }
  const [hovered, setHovered] = useState(null)

  // Cross-link: when navigated here for a company, show the full web and select it.
  const onFocus = useCallback((ticker) => {
    if (financingParticipants.has(ticker)) {
      setView('all')
      setSelected({ kind: 'node', ticker })
    }
  }, [])
  useCompanyFocus('financing', onFocus)

  const visibleEdges = useMemo(() => {
    if (view === 'loops') return edges.filter((e) => e.loop)
    if (view === 'straight') return edges.filter((e) => !e.loop)
    return edges
  }, [view])

  // Chord layout: arc spans proportional to sqrt(flow weight) per entity.
  const chord = useMemo(() => {
    const present = ENTITY_ORDER.filter((t) => visibleEdges.some((e) => e.from === t || e.to === t))
    const w = visibleEdges.map((e) => parseBillions(e.amount) ?? MIN_WEIGHT)
    const sw = w.map(Math.sqrt)
    const entW = {}
    present.forEach((t) => {
      entW[t] = 0
    })
    visibleEdges.forEach((e, i) => {
      entW[e.from] += sw[i]
      entW[e.to] += sw[i]
    })
    const total = Object.values(entW).reduce((a, b) => a + b, 0) || 1
    const avail = 2 * Math.PI - GAP * present.length
    const spans = {}
    let ang = -Math.PI / 2
    present.forEach((t) => {
      const s = (entW[t] / total) * avail
      spans[t] = [ang, ang + s]
      ang += s + GAP
    })
    const cur = {}
    present.forEach((t) => {
      cur[t] = spans[t][0]
    })
    const take = (t, frac) => {
      const a0 = cur[t]
      const a1 = a0 + (spans[t][1] - spans[t][0]) * frac
      cur[t] = a1
      return [a0, a1]
    }
    const alloc = visibleEdges.map((e, i) => [take(e.from, sw[i] / entW[e.from]), take(e.to, sw[i] / entW[e.to])])
    // Pill position along each curve; parallel same-pair flows get staggered
    // positions so their pills don't sit on each other.
    const seen = {}
    const pillT = visibleEdges.map((e) => {
      const k = `${e.from}>${e.to}`
      seen[k] = (seen[k] ?? -1) + 1
      return 0.24 + seen[k] * 0.07
    })
    return { present, spans, alloc, w, pillT }
  }, [visibleEdges])

  const activeFlow = selected?.kind === 'flow' ? selected.index : hovered

  const clearSelection = useCallback(() => setSelected(null), [])

  return (
    <section>
      <SectionHeader section={section} accent={section.color} icon={FinancingIcon} />

      <div className="mb-lg">
        <CompareToggle
          value={view}
          onChange={(v) => {
            setView(v)
            setSelected(null)
            setHovered(null)
          }}
          ariaLabel="Financing view"
          options={[
            { id: 'all', label: 'All flows' },
            { id: 'loops', label: 'Circular only' },
            { id: 'straight', label: 'Straight only' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-lg lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="scroll-x overflow-x-auto rounded-card border border-line bg-surface p-sm">
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Financing capital flows, ${view === 'all' ? 'all flows' : view === 'loops' ? 'circular loops only' : 'straight investments only'}`}
              onClick={clearSelection}
              style={{ width: '100%', height: 'auto', minWidth: 560, fontFamily: 'inherit' }}
            >
              <g key={view}>
                {/* Flows (under the arcs) */}
                {visibleEdges.map((e, i) => {
                  const wSrc = Math.min(30, 3.5 + Math.sqrt(chord.w[i]) * 1.7)
                  const wTgt = Math.max(1, wSrc * 0.1)
                  const [sa, ta] = chord.alloc[i]
                  const committed = e.realized === false
                  const dimmed = activeFlow != null && activeFlow !== i
                  const isActive = activeFlow === i
                  const color = companyColor(e.from)
                  const label = pillLabel(e.amount)
                  const hasPill = parseBillions(e.amount) != null
                  const r = R_IN - 8
                  const p0 = arcMid(sa, r)
                  const p1 = arcMid(ta, r)
                  const [px, py] = curvePoint(p0, p1, chord.pillT[i])
                  const prot = curveAngle(p0, p1, chord.pillT[i])
                  const pillW = 9.5 * label.length + 30
                  return (
                    <g
                      key={i}
                      className="fin-flow"
                      style={{ animationDelay: `${i * 35}ms`, opacity: dimmed ? 0.12 : 1, cursor: 'pointer' }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setSelected((prev) => (prev?.kind === 'flow' && prev.index === i ? null : { kind: 'flow', index: i }))
                      }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${e.from} to ${e.to}: ${e.amount}, ${committed ? 'committed' : 'realized'}`}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          setSelected((prev) => (prev?.kind === 'flow' && prev.index === i ? null : { kind: 'flow', index: i }))
                        }
                      }}
                    >
                      <title>{`${e.from} → ${e.to}: ${e.amount}`}</title>
                      {/* White casing keeps each flow traceable where bands cross */}
                      <path d={taperPath(sa, ta, wSrc + 3.5, wTgt + 2)} fill="var(--surface)" />
                      <path
                        d={taperPath(sa, ta, wSrc, wTgt)}
                        fill={color}
                        opacity={committed ? 0.62 : 0.92}
                        stroke={isActive ? 'var(--ink)' : 'none'}
                        strokeWidth={isActive ? 1.5 : 0}
                      />
                      {hasPill && (
                        <g transform={`translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(${prot.toFixed(1)})`}>
                          <rect
                            x={(-pillW / 2).toFixed(1)}
                            y="-14"
                            width={pillW.toFixed(1)}
                            height="28"
                            rx="14"
                            fill="var(--surface)"
                            stroke={color}
                            strokeWidth="2"
                          />
                          <text y="5" fontSize="14" fontWeight="800" fill="var(--ink)" textAnchor="middle">
                            {label}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}

                {/* Entity arcs */}
                {chord.present.map((t) => {
                  const [a0, a1] = chord.spans[t]
                  const span = a1 - a0
                  const am = (a0 + a1) / 2
                  const color = companyColor(t)
                  const isSelected = selected?.kind === 'node' && selected.ticker === t
                  const dimmed = selected?.kind === 'node' && !isSelected
                  const lx = CX + (R_OUT + 36) * Math.cos(am)
                  const ly = CY + (R_OUT + 36) * Math.sin(am)
                  const ca = Math.cos(am)
                  const anch = ca > 0.35 ? 'start' : ca < -0.35 ? 'end' : 'middle'
                  const deg = (am * 180) / Math.PI
                  let rot = deg + 90
                  if ((((deg % 360) + 360) % 360) > 90 && (((deg % 360) + 360) % 360) < 270) rot += 180
                  const [tx, ty] = [CX + ((R_OUT + R_IN) / 2) * Math.cos(am), CY + ((R_OUT + R_IN) / 2) * Math.sin(am)]
                  return (
                    <g
                      key={t}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setSelected((prev) => (prev?.kind === 'node' && prev.ticker === t ? null : { kind: 'node', ticker: t }))
                      }}
                      style={{ cursor: 'pointer', opacity: dimmed ? 0.35 : 1 }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${getCompany(t)?.name ?? t}: show capital in and out`}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          setSelected((prev) => (prev?.kind === 'node' && prev.ticker === t ? null : { kind: 'node', ticker: t }))
                        }
                      }}
                    >
                      <title>{getCompany(t)?.name ?? t}</title>
                      <path
                        d={arcPath(a0, a1)}
                        fill={color}
                        opacity="0.92"
                        stroke={isSelected ? 'var(--ink)' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                      <text
                        x={lx.toFixed(1)}
                        y={ly.toFixed(1)}
                        fontSize="15"
                        fontWeight="600"
                        fill="var(--ink)"
                        textAnchor={anch}
                        dominantBaseline="central"
                      >
                        {t}
                      </text>
                      {span > 0.42 && (
                        <g transform={`translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
                          <text y="4.5" fontSize="12.5" fontWeight="800" fill="#ffffff" textAnchor="middle" letterSpacing="1">
                            {t}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>
          <p className="mt-sm text-caption text-ink-faint">{financing.note}</p>
        </div>

        <div className="flex flex-col gap-lg lg:w-96 lg:shrink-0">
          {selected?.kind === 'flow' ? (
            <FlowInspector edge={visibleEdges[selected.index]} onClear={clearSelection} />
          ) : selected?.kind === 'node' ? (
            <FinancingInspector ticker={selected.ticker} onClear={clearSelection} />
          ) : (
            <p className="text-label text-ink-faint">
              Tap any flow for its terms, or any company for the capital flowing in and out. Bands taper in the
              direction of flow — thick at the investor, thin at the recipient.
            </p>
          )}
          <RankedBars />
        </div>
      </div>

      <KeyCard present={chord.present} />
    </section>
  )
}

function KeyCard({ present }) {
  // One swatch per distinct investor color in the current view; shared colors
  // get a combined label plus a footnote naming everyone on that color.
  const groups = useMemo(() => {
    const gs = []
    present.forEach((t) => {
      const color = companyColor(t)
      const g = gs.find((g) => g.color === color)
      const name = getCompany(t)?.name ?? t
      if (g) g.names.push(name)
      else gs.push({ color, names: [name] })
    })
    return gs
  }, [present])
  const footnotes = groups.filter((g) => g.names.length > 2)

  return (
    <div className="mt-lg rounded-card border border-line bg-surface p-lg">
      <div className="text-label font-medium text-ink">How to read this chart</div>
      <div className="mt-md grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-eyebrow uppercase text-ink-faint">Direction</div>
          <svg width="150" height="24" aria-hidden="true" className="mt-xs">
            <path d="M4,3 L146,9 L146,13 L4,21 Z" fill="var(--ink)" opacity="0.8" />
          </svg>
          <div className="flex w-[150px] justify-between text-caption text-ink-faint">
            <span>investor</span>
            <span>recipient</span>
          </div>
          <p className="mt-2xs text-caption text-ink-soft">Tapers in the direction of flow</p>
        </div>
        <div>
          <div className="text-eyebrow uppercase text-ink-faint">Investor</div>
          <div className="mt-xs grid grid-cols-2 gap-x-sm gap-y-2xs">
            {groups.map((g) => (
              <span key={g.color} className="inline-flex items-center gap-2xs text-caption text-ink-soft">
                <span className="inline-block h-3.5 w-6 rounded-[3px]" style={{ background: g.color }} aria-hidden="true" />
                {g.names.length > 2 ? `${g.names[0]}*` : g.names.join(' · ')}
              </span>
            ))}
          </div>
          <p className="mt-2xs text-caption text-ink-soft">Line color identifies the investor</p>
          {footnotes.map((g) => (
            <p key={g.color} className="mt-2xs text-caption text-ink-faint">
              * {g.names.join(', ')} share this color.
            </p>
          ))}
        </div>
        <div>
          <div className="text-eyebrow uppercase text-ink-faint">Status</div>
          <div className="mt-xs flex items-center gap-xs text-caption text-ink-soft">
            <svg width="56" height="10" aria-hidden="true">
              <rect width="56" height="10" rx="5" fill="var(--ink-soft)" />
            </svg>
            Realized
          </div>
          <div className="mt-2xs flex items-center gap-xs text-caption text-ink-soft">
            <svg width="56" height="10" aria-hidden="true">
              <rect width="56" height="10" rx="5" fill="var(--ink-soft)" opacity="0.55" />
            </svg>
            Committed
          </div>
        </div>
        <div>
          <div className="text-eyebrow uppercase text-ink-faint">Amount</div>
          <svg width="120" height="32" aria-hidden="true" className="mt-xs">
            <rect x="4" y="2" width="92" height="28" rx="14" fill="var(--surface)" stroke="var(--ink-soft)" strokeWidth="2" />
            <text x="50" y="21" fontSize="13" fontWeight="800" fill="var(--ink)" textAnchor="middle">
              $100B
            </text>
          </svg>
          <p className="mt-2xs text-caption text-ink-soft">Disclosed deal value</p>
        </div>
      </div>
    </div>
  )
}

function RankedBars() {
  const rows = useMemo(
    () =>
      edges
        .filter((e) => !e.loop)
        .map((e) => ({ e, v: parseBillions(e.amount) }))
        .sort((a, b) => (b.v ?? -1) - (a.v ?? -1)),
    [],
  )
  const max = Math.max(0, ...rows.map((r) => r.v ?? 0))
  return (
    <div className="rounded-card border border-line bg-surface p-lg">
      <div className="text-label font-medium text-ink">Scale — ranked amounts</div>
      <p className="mt-2xs text-caption text-ink-faint">Bars use the investor&apos;s company color</p>
      <ul className="mt-md space-y-md">
        {rows.map(({ e, v }) => (
          <li key={`${e.from}>${e.to}`}>
            <div className="text-label text-ink-soft">
              {e.from} → {e.to}
            </div>
            {v != null && max > 0 ? (
              <div
                className="mt-2xs h-[22px] rounded-[5px]"
                style={{ width: `${Math.max(14, (v / max) * 100)}%`, background: companyColor(e.from), opacity: 0.85 }}
                role="img"
                aria-label={`${e.amount}`}
              />
            ) : (
              <div className="mt-2xs text-caption text-ink-faint">terms undisclosed</div>
            )}
            <div className="mt-2xs text-caption font-medium text-ink">
              {e.amount} · {e.type}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FlowInspector({ edge, onClear }) {
  const from = getCompany(edge.from)
  const to = getCompany(edge.to)
  const committed = edge.realized === false
  const rstate = getRealizedState(edge.realized)
  return (
    <div
      className="rounded-card border border-line bg-surface p-lg"
      style={{ boxShadow: `inset 3px 0 0 ${from?.color ?? 'var(--ink)'}` }}
    >
      <div className="flex items-start justify-between gap-xs">
        <div className="text-heading font-medium">
          <span style={{ color: from?.color }}>{from?.name ?? edge.from}</span>
          <span className="text-ink-faint"> → </span>
          <span style={{ color: to?.color }}>{to?.name ?? edge.to}</span>
        </div>
        <button type="button" onClick={onClear} className="shrink-0 text-caption text-ink-faint hover:text-ink">
          Clear
        </button>
      </div>
      <div className="mt-sm flex flex-wrap items-center gap-x-sm gap-y-2xs text-label">
        <span className="text-title font-semibold text-ink">{edge.amount}</span>
        <span className="text-ink-faint">{edge.type}</span>
        <span
          className={
            'rounded-control px-1.5 py-0.5 text-eyebrow uppercase ' +
            (committed ? 'border border-dashed border-ink-faint text-ink-faint' : 'bg-surface-raised text-ink-soft')
          }
          title={rstate?.note}
        >
          {rstate?.label ?? (committed ? 'Committed' : 'Realized')}
        </span>
        <SourceTag tier={edge.tier} showLabel={false} />
      </div>
      {edge.asOf && <p className="mt-2xs text-caption text-ink-faint">As of {edge.asOf}</p>}
      {edge.note && <p className="mt-sm text-caption text-ink-soft">{edge.note}</p>}
      {edge.loop && (
        <p className="mt-sm text-caption" style={{ color: 'var(--loop)' }}>
          Part of a circular-financing loop — capital flows both ways between these companies.
        </p>
      )}
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
                    <span className="rounded-control px-1 text-eyebrow font-medium uppercase" style={{ color: 'var(--loop)', background: 'var(--loop-soft)' }}>
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
