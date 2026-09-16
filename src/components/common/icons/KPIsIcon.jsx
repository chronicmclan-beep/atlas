export default function KPIsIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <path d="M20 50 A20 20 0 0 1 60 50" stroke="white"
        strokeWidth="2.5" strokeOpacity="0.5"
        strokeLinecap="round"/>
      <path d="M20 50 A20 20 0 0 1 30 32.6" stroke="white"
        strokeWidth="4" strokeLinecap="round"/>
      <line x1="40" y1="50" x2="54" y2="33" stroke="white"
        strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="40" cy="50" r="4.5" fill="white"/>
      <circle cx="40" cy="50" r="2" fill="currentColor"/>
    </svg>
  );
}
