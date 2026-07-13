import { describe, expect, it } from 'vitest'

import { APP_VERSION } from './appVersion'

describe('APP_VERSION', () => {
  it('exposes a non-empty version string', () => {
    expect(typeof APP_VERSION).toBe('string')
    expect(APP_VERSION.length).toBeGreaterThan(0)
  })
})
