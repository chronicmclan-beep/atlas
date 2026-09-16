export default function LayerMapIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <rect x="24" y="25" width="32" height="8" rx="2.5"
        fill="white"/>
      <rect x="21" y="37" width="38" height="8" rx="2.5"
        fill="white" fillOpacity="0.7"/>
      <rect x="18" y="49" width="44" height="8" rx="2.5"
        fill="white" fillOpacity="0.45"/>
    </svg>
  );
}
