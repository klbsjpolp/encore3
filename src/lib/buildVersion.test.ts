import { describe, expect, it } from 'vitest'

import { resolveBuildVersion } from './buildVersion'

describe('resolveBuildVersion', () => {
  it('falls back to the package version when no override is set', () => {
    expect(resolveBuildVersion(undefined, '1.2.3')).toBe('v1.2.3')
    expect(resolveBuildVersion('', '1.2.3')).toBe('v1.2.3')
    expect(resolveBuildVersion('   ', '1.2.3')).toBe('v1.2.3')
  })

  it('prefers the override version when provided', () => {
    expect(resolveBuildVersion('2.0.0', '1.2.3')).toBe('v2.0.0')
  })

  it('keeps a single leading v', () => {
    expect(resolveBuildVersion('v2.0.0', '1.2.3')).toBe('v2.0.0')
    expect(resolveBuildVersion(undefined, 'v1.2.3')).toBe('v1.2.3')
  })
})
