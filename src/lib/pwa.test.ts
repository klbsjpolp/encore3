import { describe, expect, it } from 'vitest'

import { shouldRegisterServiceWorker } from './pwa'

describe('shouldRegisterServiceWorker', () => {
  it('returns true in production when service worker API is available', () => {
    expect(shouldRegisterServiceWorker(true, true)).toBe(true)
  })

  it('returns false outside production', () => {
    expect(shouldRegisterServiceWorker(false, true)).toBe(false)
  })

  it('returns false when service worker API is unavailable', () => {
    expect(shouldRegisterServiceWorker(true, false)).toBe(false)
  })
})
