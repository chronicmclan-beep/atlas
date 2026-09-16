export default function TimelineIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <line x1="20" y1="52" x2="60" y2="52" stroke="white"
        strokeWidth="3" strokeLinecap="round"
        strokeOpacity="0.55"/>
      <circle cx="28" cy="52" r="3" fill="white"
        fillOpacity="0.6"/>
      <circle cx="52" cy="52" r="3" fill="white"
        fillOpacity="0.6"/>
      <line x1="40" y1="52" x2="40" y2="26" stroke="white"
        strokeWidth="2.5"/>
      <path d="M40 24 l16 5.5 l-16 5.5 z" fill="white"/>
      <circle cx="40" cy="52" r="4" fill="white"/>
      <circle cx="40" cy="52" r="1.8" fill="currentColor"/>
    </svg>
  );
}
