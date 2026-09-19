const C30 = Math.cos(Math.PI / 6)
const S30 = 0.5

function isoColumn(bx, by, w, d, h, dividers, cTop, cLeft, cRight) {
  const t = by - h
  const p0 = [bx, t]
  const p1 = [bx + w * C30, t + w * S30]
  const p2 = [bx + w * C30 - d * C30, t + w * S30 + d * S30]
  const p3 = [bx - d * C30, t + d * S30]
  const pts = (a) => a.map((p) => p.join(',')).join(' ')
  return (
    <g>
      <polygon points={pts([p0, p1, [p1[0], p1[1] + h], [p0[0], p0[1] + h]])} fill={cRight} />
      <polygon points={pts([p0, p3, [p3[0], p3[1] + h], [p0[0], p0[1] + h]])} fill={cLeft} />
      <polygon points={pts([p0, p1, p2, p3])} fill={cTop} />
      {dividers.map((hk, i) => {
        const y0 = by - hk
        return (
          <g key={i} stroke="#3f6600" strokeWidth="1.5" opacity="0.7">
            <line x1={p0[0]} y1={y0} x2={p1[0]} y2={y0 + w * S30} />
            <line x1={p0[0]} y1={y0} x2={p3[0]} y2={y0 + d * S30} />
          </g>
        )
      })}
    </g>
  )
}

export default function RevenueIcon({ size = 48 }) {
  const SH = 5.5, GAP = 1.5, BY = 56
  const bars = [
    { bx: 15, n: 2 },
    { bx: 29, n: 3 },
    { bx: 43, n: 4 },
    { bx: 57, n: 5 },
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="rev-iso-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {bars.map((b) => (
        <ellipse key={'s' + b.bx} cx={b.bx} cy="60" rx="10" ry="3"
          fill="#000000" opacity="0.22" filter="url(#rev-iso-soft)" />
      ))}
      {bars.map((b, i) => {
        const H = b.n * SH + (b.n - 1) * GAP
        const divs = Array.from({ length: b.n - 1 }, (_, k) => (k + 1) * (SH + GAP))
        if (i === bars.length - 1) {
          const lowN = b.n - 1
          const hLow = lowN * SH + (lowN - 1) * GAP
          const lowDivs = Array.from({ length: lowN - 1 }, (_, k) => (k + 1) * (SH + GAP))
          return (
            <g key={b.bx}>
              {isoColumn(b.bx, BY, 8, 8, hLow, lowDivs, '#eaf6d2', 'currentColor', '#527f00')}
              {isoColumn(b.bx, BY - hLow - GAP, 8, 8, SH, [], '#ffffff', '#f0f0f0', '#d8d8d8')}
            </g>
          )
        }
        return (
          <g key={b.bx}>
            {isoColumn(b.bx, BY, 8, 8, H, divs, '#eaf6d2', 'currentColor', '#527f00')}
          </g>
        )
      })}
    </svg>
  )
}
