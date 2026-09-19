function Cube({ cx, cy }) {
  const w = 7, th = 4, sh = 8
  return (
    <g>
      <polygon
        points={`${cx - w},${cy} ${cx},${cy + th} ${cx},${cy + th + sh} ${cx - w},${cy + sh}`}
        fill="#e6dcc6" />
      <polygon
        points={`${cx + w},${cy} ${cx},${cy + th} ${cx},${cy + th + sh} ${cx + w},${cy + sh}`}
        fill="#c9bb9c" />
      <polygon
        points={`${cx},${cy - th} ${cx + w},${cy} ${cx},${cy + th} ${cx - w},${cy}`}
        fill="#fbf8ef" />
    </g>
  )
}

export default function SupplyChainIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sc-iso-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {/* soft ground shadows */}
      <ellipse cx="32" cy="39" rx="8" ry="2.5" fill="#5a3d14" opacity="0.25" filter="url(#sc-iso-soft)" />
      <ellipse cx="55" cy="39" rx="8" ry="2.5" fill="#5a3d14" opacity="0.25" filter="url(#sc-iso-soft)" />
      <ellipse cx="41" cy="66" rx="8" ry="2.5" fill="#5a3d14" opacity="0.25" filter="url(#sc-iso-soft)" />
      {/* connecting rods */}
      <line x1="38" y1="28" x2="49" y2="28" stroke="#d6c5a0" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="35" x2="43" y2="47" stroke="#d6c5a0" strokeWidth="4" strokeLinecap="round" />
      {/* three cubes */}
      <Cube cx={32} cy={25} />
      <Cube cx={55} cy={25} />
      <Cube cx={41} cy={52} />
    </svg>
  )
}
