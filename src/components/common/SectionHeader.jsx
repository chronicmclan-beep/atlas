/*
  SectionHeader — the consistent header every section shows: an icon slot, the
  section number, title, and one-line blurb. Reads from the section metadata so
  the wording lives in one place (src/lib/sections.js).

  Props:
    section — { num, label, blurb }
    accent  — the section's accent color (section.color); tints the eyebrow and
              the icon slot.
    icon    — optional SVG component for the icon slot. When absent, a two-tone
              placeholder (soft tint + solid dot) stands in. Real icon art drops
              in via this prop with no other change: the slot sets the size and
              paints in the accent color, so icons should use currentColor.
*/
export default function SectionHeader({ section, accent, icon: Icon, children }) {
  return (
    <header className="mb-xl flex items-start gap-md">
      <SectionIcon accent={accent ?? 'var(--ink-faint)'} Icon={Icon} />
      <div className="max-w-2xl">
        <div
          className={'text-eyebrow uppercase ' + (accent ? 'font-medium' : 'text-ink-faint')}
          style={accent ? { color: accent } : undefined}
        >
          Section {section.num}
        </div>
        <h1 className="mt-2xs text-title font-medium">{section.label}</h1>
        <p className="mt-sm text-body text-ink-soft">{section.blurb}</p>
        {children}
      </div>
    </header>
  )
}

function SectionIcon({ accent, Icon }) {
  // Real icon: a self-contained circular badge that paints in the accent color
  // via currentColor. It fills the slot, so no tint box is needed. These icon
  // components take a `size` prop (not className), so size them explicitly.
  if (Icon) {
    return (
      <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0" style={{ color: accent }}>
        <Icon size={44} />
      </span>
    )
  }
  // Placeholder until real icon art is wired in: two-tone tint box + solid dot.
  const tint = `color-mix(in srgb, ${accent} 16%, transparent)`
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card"
      style={{ background: tint, color: accent }}
    >
      <span className="h-3.5 w-3.5 rounded-full" style={{ background: accent }} />
    </span>
  )
}
