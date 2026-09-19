export default function TimelineIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {/* drafting guides */}
      <circle cx="40" cy="38" r="24" stroke="#ffffff" strokeWidth="2"
        strokeDasharray="6 5" strokeOpacity="0.5" />
      <line x1="40" y1="12" x2="40" y2="30" stroke="#ffffff" strokeWidth="2"
        strokeDasharray="4 4" strokeOpacity="0.6" />
      {/* main rail */}
      <rect x="17.5" y="37.5" width="45" height="7" rx="3.5" fill="#ffffff" />
      {/* nodes: ring, solid, ring */}
      <circle cx="24" cy="41" r="6.5" fill="#ffffff" />
      <circle cx="24" cy="41" r="3" fill="currentColor" />
      <circle cx="40" cy="41" r="6" fill="#ffffff" />
      <circle cx="56" cy="41" r="6.5" fill="#ffffff" />
      <circle cx="56" cy="41" r="3" fill="currentColor" />
      {/* corner registration marks */}
      <g stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.8" strokeLinecap="round">
        <line x1="11" y1="14" x2="17" y2="14" />
        <line x1="14" y1="11" x2="14" y2="17" />
        <line x1="63" y1="62" x2="69" y2="62" />
        <line x1="66" y1="59" x2="66" y2="65" />
      </g>
      {/* tick ruler */}
      <g stroke="#ffffff" strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round">
        <line x1="20" y1="64" x2="20" y2="67" />
        <line x1="25" y1="64" x2="25" y2="67" />
        <line x1="30" y1="64" x2="30" y2="67" />
        <line x1="35" y1="64" x2="35" y2="67" />
        <line x1="40" y1="64" x2="40" y2="67" />
        <line x1="45" y1="64" x2="45" y2="67" />
        <line x1="50" y1="64" x2="50" y2="67" />
        <line x1="55" y1="64" x2="55" y2="67" />
        <line x1="60" y1="64" x2="60" y2="67" />
      </g>
    </svg>
  )
}
