import '@testing-library/jest-dom'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const resizeWindow = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })

  window.dispatchEvent(new Event('resize'))
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: window.innerWidth <= Number.parseInt(query.match(/\d+/)?.[0] ?? '0', 10),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, 'resizeTo', {
  writable: true,
  value: resizeWindow,
})

resizeWindow(1024, 768)

afterEach(() => {
  cleanup()
  resizeWindow(1024, 768)
})
