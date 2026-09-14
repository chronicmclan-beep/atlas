/*
  SectionHeader — the consistent header every section shows: the section
  number, title, and one-line blurb. Reads from the section metadata so the
  wording lives in one place (src/lib/sections.js).
*/
export default function SectionHeader({ section, children }) {
  return (
    <header className="mb-xl max-w-2xl">
      <div className="text-eyebrow uppercase text-ink-faint">Section {section.num}</div>
      <h1 className="mt-2xs text-title font-medium">{section.label}</h1>
      <p className="mt-sm text-body text-ink-soft">{section.blurb}</p>
      {children}
    </header>
  )
}
