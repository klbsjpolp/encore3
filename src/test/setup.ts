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

// Node exposes a global `localStorage` that shadows jsdom's Storage but lacks a
// usable API, so provide a simple in-memory implementation for tests.
const createLocalStorage = (): Storage => {
  let store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear: () => {
      store = new Map<string, string>()
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: createLocalStorage(),
})

resizeWindow(1024, 768)

afterEach(() => {
  cleanup()
  resizeWindow(1024, 768)
  // Some tests replace window.localStorage with a partial mock.
  window.localStorage.clear?.()
})
