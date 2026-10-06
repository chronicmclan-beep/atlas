export default function CompareIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cmp-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {/* soft ground shadows under each column set */}
      <ellipse cx="27" cy="58" rx="11" ry="3" fill="#000000" opacity="0.18" filter="url(#cmp-soft)" />
      <ellipse cx="53" cy="58" rx="11" ry="3" fill="#000000" opacity="0.18" filter="url(#cmp-soft)" />
      {/* left column set — ascending toward the center line */}
      <rect x="16" y="42" width="5.5" height="12" rx="2.75" fill="#ffffff" opacity="0.75" />
      <rect x="24.5" y="34" width="5.5" height="20" rx="2.75" fill="#ffffff" opacity="0.88" />
      <rect x="33" y="26" width="5.5" height="28" rx="2.75" fill="#ffffff" />
      {/* right column set — mirrored, ascending toward the center line */}
      <rect x="41.5" y="26" width="5.5" height="28" rx="2.75" fill="#ffffff" />
      <rect x="50" y="34" width="5.5" height="20" rx="2.75" fill="#ffffff" opacity="0.88" />
      <rect x="58.5" y="42" width="5.5" height="12" rx="2.75" fill="#ffffff" opacity="0.75" />
      {/* the versus line the two sides face across */}
      <line x1="40" y1="18" x2="40" y2="60" stroke="#ffffff" strokeWidth="2.5"
        strokeLinecap="round" opacity="0.95" />
    </svg>
  )
}
