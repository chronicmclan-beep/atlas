/*
  Manual theme control for Atlas.
  The token system (src/styles/tokens.css) auto-follows the OS via
  prefers-color-scheme; an explicit choice here sets
  document.documentElement.dataset.theme = 'dark' | 'light', which beats the
  OS preference. The choice persists in localStorage.
*/

const KEY = 'atlas-theme'

export function effectiveTheme() {
  const explicit = document.documentElement.dataset.theme
  if (explicit === 'dark' || explicit === 'light') return explicit
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function setTheme(mode) {
  // mode: 'dark' | 'light'
  document.documentElement.dataset.theme = mode
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* private mode — theme just won't persist */
  }
}

export function initTheme() {
  let saved = null
  try {
    saved = localStorage.getItem(KEY)
  } catch {
    /* ignore */
  }
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.dataset.theme = saved
  }
}
