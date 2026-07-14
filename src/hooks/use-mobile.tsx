import * as React from 'react'

// The desktop game layout only lays out correctly from Tailwind's `lg`
// breakpoint (1024px): below that its grid collapses to a single column and
// the opponent board renders as large as the main one. Keep the compact
// mobile layout up to that width so tablets get a usable arrangement.
const MOBILE_BREAKPOINT = 1024

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
