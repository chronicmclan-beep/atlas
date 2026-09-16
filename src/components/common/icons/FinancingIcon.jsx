export default function FinancingIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <path d="M52 28 A17 17 0 1 0 56 42" fill="none"
        stroke="white" strokeWidth="3.5"
        strokeLinecap="round"/>
      <path d="M53 20 l1 10 l-9 -3 z" fill="white"/>
      <path d="M27 60 l-1 -10 l9 3 z" fill="white"/>
      <text x="40" y="47" textAnchor="middle"
        fill="white" fontSize="20" fontWeight="500"
        fontFamily="system-ui, sans-serif">$</text>
    </svg>
  );
}
