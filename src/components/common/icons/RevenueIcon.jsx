export default function RevenueIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <rect x="22" y="46" width="6" height="10" rx="1.5"
        fill="white" fillOpacity="0.45"/>
      <rect x="32" y="40" width="6" height="16" rx="1.5"
        fill="white" fillOpacity="0.55"/>
      <rect x="42" y="34" width="6" height="22" rx="1.5"
        fill="white" fillOpacity="0.65"/>
      <polyline points="25,44 35,38 45,32 58,22" fill="none"
        stroke="white" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M58 22 l-10 0 l4 6 z" fill="white"/>
    </svg>
  );
}
