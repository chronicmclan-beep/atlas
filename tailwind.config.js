/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Source-tier confidence colors (see src/styles/tokens.css)
        tier: {
          reported: 'var(--tier-reported)',
          disclosed: 'var(--tier-disclosed)',
          estimated: 'var(--tier-estimated)',
          inferred: 'var(--tier-inferred)',
        },
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-faint': 'var(--ink-faint)',
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        accent: 'var(--accent)',
        // Circular-financing "loop" data color (Financing web).
        loop: 'var(--loop)',
        'loop-soft': 'var(--loop-soft)',
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        raised: 'var(--shadow-md)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      fontWeight: {
        // Two weights only, per spec.
        normal: '400',
        medium: '500',
      },
      // Semantic type scale (values in src/styles/tokens.css).
      fontSize: {
        eyebrow: ['var(--fs-eyebrow)', { lineHeight: 'var(--lh-eyebrow)', letterSpacing: 'var(--ls-eyebrow)' }],
        caption: ['var(--fs-caption)', { lineHeight: 'var(--lh-caption)' }],
        label: ['var(--fs-label)', { lineHeight: 'var(--lh-label)' }],
        body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
        heading: ['var(--fs-heading)', { lineHeight: 'var(--lh-heading)' }],
        title: ['var(--fs-title)', { lineHeight: 'var(--lh-title)' }],
        data: ['var(--fs-data)', { lineHeight: 'var(--lh-data)' }],
      },
      // Semantic spacing scale (values in src/styles/tokens.css).
      spacing: {
        '2xs': 'var(--space-2xs)',
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        pill: '9999px',
      },
      borderColor: {
        DEFAULT: 'var(--line)',
      },
    },
  },
  plugins: [],
}
