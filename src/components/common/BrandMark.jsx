/*
  BrandMark — the "AI Infrastructure Atlas" product mark, top-left of the
  sidebar. A dark isometric chip slab with a neon-pink trace grid on its top
  face and an underglow strip along its base edge.

  Unlike the section icons this mark is fixed-color (near-black tile, neon
  pink) in both light and dark mode — brand marks don't invert. It takes a
  `size` prop and stays crisp at the 34px nav size; the neon is a blurred
  glow layer under a crisp core, the same technique as the neon section art.
*/
const NEON = '#ff2e88'
const CORE = '#ffd9ec'

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export default function BrandMark({ size = 34 }) {
  // Slab corners: top face A-B-C-D, front face down 14px, right face sheared.
  // The slab fills the tile so the mark reads at 34px.
  const A = [13, 27]
  const B = [67, 27]
  const C = [57, 49]
  const D = [9, 49]
  const DROP = 14
  const Cp = [C[0], C[1] + DROP]
  const Dp = [D[0], D[1] + DROP]
  const Bp = [B[0], B[1] + DROP]

  // Neon trace grid across the top face (3 interior lines each way).
  const grid = []
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    grid.push([lerp(A, B, t), lerp(D, C, t)])
    grid.push([lerp(A, D, t), lerp(B, C, t)])
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <filter id="brand-neon-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="brand-ambient" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <clipPath id="brand-topface">
          <polygon points={`${A} ${B} ${C} ${D}`} />
        </clipPath>
      </defs>

      <rect x="5" y="5" width="70" height="70" rx="17" fill="#0b0b0e" />

      {/* Ambient underglow pooling beneath the slab */}
      <ellipse
        cx="36"
        cy="67"
        rx="27"
        ry="5"
        fill={NEON}
        opacity="0.45"
        filter="url(#brand-ambient)"
      />

      {/* Slab: right face, front face, top face */}
      <polygon points={`${B} ${C} ${Cp} ${Bp}`} fill="#0e0e13" />
      <polygon points={`${D} ${C} ${Cp} ${Dp}`} fill="#14141a" />
      <polygon points={`${A} ${B} ${C} ${D}`} fill="#20202a" />

      {/* Neon trace grid — glow layer, then crisp core, clipped to the face */}
      <g clipPath="url(#brand-topface)">
        <g stroke={NEON} strokeWidth="3" opacity="0.85" filter="url(#brand-neon-glow)">
          {grid.map(([p, q], i) => (
            <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
          ))}
        </g>
        <g stroke={CORE} strokeWidth="1.1">
          {grid.map(([p, q], i) => (
            <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
          ))}
        </g>
      </g>

      {/* Neon strip along the base front edge */}
      <line
        x1={Dp[0]}
        y1={Dp[1]}
        x2={Cp[0]}
        y2={Cp[1]}
        stroke={NEON}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.9"
        filter="url(#brand-neon-glow)"
      />
      <line
        x1={Dp[0]}
        y1={Dp[1]}
        x2={Cp[0]}
        y2={Cp[1]}
        stroke={CORE}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
