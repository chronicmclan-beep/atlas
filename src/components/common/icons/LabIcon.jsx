/*
  LabIcon — Signal Mark for Section 09 "The Lab".

  Literal meaning: a laboratory flask (the sandbox where design experiments
  are mixed and tested). Rounded-square tile in the section accent
  (currentColor), white flask glyph with liquid and rising bubbles, soft
  ground shadow — same formula as the other section marks.
*/
export default function LabIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lab-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <rect x="8" y="8" width="64" height="64" rx="15" fill="currentColor" />
      {/* soft ground shadow under the flask */}
      <ellipse cx="40" cy="62" rx="14" ry="3" fill="#000000" opacity="0.18" filter="url(#lab-soft)" />
      {/* flask neck */}
      <rect x="35" y="18" width="10" height="11" rx="2" fill="#ffffff" opacity="0.92" />
      {/* flask body — erlenmeyer triangle */}
      <path d="M35 29 L22 58 Q21.4 61 24.5 61 L55.5 61 Q58.6 61 58 58 L45 29 Z"
        fill="#ffffff" opacity="0.92" />
      {/* liquid inside the body */}
      <path d="M30.5 45 L26 58 Q25.7 59.5 27.5 59.5 L52.5 59.5 Q54.3 59.5 54 58 L49.5 45 Z"
        fill="currentColor" opacity="0.85" />
      {/* rising bubbles */}
      <circle cx="36" cy="52" r="2.2" fill="#ffffff" />
      <circle cx="43" cy="48.5" r="1.6" fill="#ffffff" opacity="0.9" />
      <circle cx="39.5" cy="42" r="1.2" fill="#ffffff" opacity="0.75" />
    </svg>
  )
}
