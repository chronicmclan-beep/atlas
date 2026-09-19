export default function KPIsIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="kpi-clay-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {/* soft ground shadows */}
      <ellipse cx="26.5" cy="60" rx="8" ry="2.5" fill="#000000" opacity="0.15" filter="url(#kpi-clay-soft)" />
      <ellipse cx="37.5" cy="60" rx="8" ry="2.5" fill="#000000" opacity="0.15" filter="url(#kpi-clay-soft)" />
      <ellipse cx="48.5" cy="60" rx="8" ry="2.5" fill="#000000" opacity="0.15" filter="url(#kpi-clay-soft)" />
      {/* puffy clay bars, ascending */}
      <rect x="22" y="40" width="9" height="14" rx="4.5" fill="#a9d3f2" />
      <rect x="33" y="33" width="9" height="21" rx="4.5" fill="#c2e0f8" />
      <rect x="44" y="27" width="9" height="27" rx="4.5" fill="#ffffff" />
      {/* soft top highlights */}
      <rect x="24.5" y="43" width="4" height="6" rx="2" fill="#ffffff" opacity="0.45" />
      <rect x="35.5" y="36" width="4" height="8" rx="2" fill="#ffffff" opacity="0.45" />
      <rect x="46.5" y="30" width="4" height="10" rx="2" fill="#d6e9fa" opacity="0.7" />
      {/* floating dot above the tallest bar */}
      <circle cx="52" cy="18" r="4.5" fill="#ffffff" />
    </svg>
  )
}
