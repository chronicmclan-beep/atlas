export default function SupplyChainIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <rect x="22" y="28" width="24" height="14" rx="7"
        fill="none" stroke="white" strokeWidth="3.5"/>
      <rect x="34" y="38" width="24" height="14" rx="7"
        fill="none" stroke="white" strokeWidth="3.5"
        strokeOpacity="0.6"/>
      <rect x="36" y="34" width="8" height="12" rx="3"
        fill="currentColor"/>
    </svg>
  );
}
