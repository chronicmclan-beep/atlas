export default function GlossaryIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="currentColor"/>
      <path d="M40 27 C34 23 26 23 22 25 L22 53 C26 51 34 51 40 55 C46 51 54 51 58 53 L58 25 C54 23 46 23 40 27 Z"
        fill="white" fillOpacity="0.92"/>
      <line x1="40" y1="27" x2="40" y2="55" stroke="currentColor"
        strokeWidth="2.5"/>
      <line x1="27" y1="33" x2="35" y2="34.4" stroke="currentColor"
        strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
      <line x1="27" y1="39" x2="35" y2="40.4" stroke="currentColor"
        strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
      <line x1="45" y1="34.4" x2="53" y2="33" stroke="currentColor"
        strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
      <line x1="45" y1="40.4" x2="53" y2="39" stroke="currentColor"
        strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
    </svg>
  );
}
