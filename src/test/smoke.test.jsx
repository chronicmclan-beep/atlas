/*
  Smoke tests — the lightest possible "does it turn on?" check.
  They render the real app and click through all seven sections, confirming each
  one mounts and shows its title without throwing. If a change crashes a
  section, this test goes red before it can ship.
*/
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import App from '../App.jsx'
import { SECTIONS } from '../lib/sections.js'

afterEach(cleanup)

describe('Atlas smoke test', () => {
  it('renders the app shell with all seven sections in the navigation', () => {
    render(<App />)
    const nav = screen.getByRole('navigation')
    const navButtons = within(nav).getAllByRole('button')
    expect(navButtons.length).toBe(SECTIONS.length)
    expect(SECTIONS.length).toBe(7)
  })

  it('opens each of the seven sections without crashing', () => {
    render(<App />)
    const nav = screen.getByRole('navigation')

    for (const section of SECTIONS) {
      const button = within(nav).getByRole('button', {
        name: new RegExp(section.label, 'i'),
      })
      fireEvent.click(button)

      // The active section renders its title via the shared SectionHeader.
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toContain(section.label)
    }
  })
})
