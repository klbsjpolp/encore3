import { afterEach, describe, expect, it, vi } from 'vitest'

import { isVibrationSupported } from './vibration'

describe('isVibrationSupported', () => {
  afterEach(() => {
    // @ts-expect-error -- cleanup of the test-only stub
    delete navigator.vibrate
  })

  it('returns true when navigator.vibrate exists', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    })

    expect(isVibrationSupported()).toBe(true)
  })

  it('returns false when navigator.vibrate is absent (e.g. iOS Safari)', () => {
    // @ts-expect-error -- simulate an unsupported browser
    delete navigator.vibrate

    expect(isVibrationSupported()).toBe(false)
  })
})
