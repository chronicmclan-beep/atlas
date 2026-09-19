export default function LayerMapIcon({ size = 48 }) {
  const shadow = '#375413' // currentColor (#639922) deepened for the hard paper shadow
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {/* cut-paper strips: hard offset shadow + tinted paper, hand-placed */}
      <g transform="rotate(-3 40 20.5)">
        <rect x="20.5" y="18" width="44" height="11" rx="5.5" fill={shadow} />
        <rect x="18" y="15" width="44" height="11" rx="5.5" fill="#d9e9bd" />
      </g>
      <g transform="rotate(2.5 40 36.5)">
        <rect x="20.5" y="34" width="44" height="11" rx="5.5" fill={shadow} />
        <rect x="18" y="31" width="44" height="11" rx="5.5" fill="#b7d695" />
      </g>
      <g transform="rotate(-2 40 52.5)">
        <rect x="20.5" y="50" width="44" height="11" rx="5.5" fill={shadow} />
        <rect x="18" y="47" width="44" height="11" rx="5.5" fill="#ffffff" />
      </g>
    </svg>
  )
}
