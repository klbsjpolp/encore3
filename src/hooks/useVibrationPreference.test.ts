import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useVibrationPreference } from './useVibrationPreference'

const STORAGE_KEY = 'encore:vibration:v1'

describe('useVibrationPreference', () => {
  let vibrateMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    // @ts-expect-error -- cleanup of the test-only stub
    delete navigator.vibrate
  })

  it('starts enabled by default when nothing is stored', () => {
    const { result } = renderHook(() => useVibrationPreference())

    expect(result.current.vibrationEnabled).toBe(true)
  })

  it('persists the toggle and restores it on the next mount', () => {
    const { result } = renderHook(() => useVibrationPreference())

    act(() => {
      result.current.toggleVibration()
    })

    expect(result.current.vibrationEnabled).toBe(false)

    const { result: restored } = renderHook(() => useVibrationPreference())
    expect(restored.current.vibrationEnabled).toBe(false)
  })

  it('falls back to enabled when the stored value is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    const { result } = renderHook(() => useVibrationPreference())

    expect(result.current.vibrationEnabled).toBe(true)
  })

  it('calls navigator.vibrate with the given pattern when enabled', () => {
    const { result } = renderHook(() => useVibrationPreference())

    act(() => {
      result.current.vibrate(15)
    })

    expect(vibrateMock).toHaveBeenCalledWith(15)
  })

  it('does not call navigator.vibrate when disabled', () => {
    const { result } = renderHook(() => useVibrationPreference())

    act(() => {
      result.current.toggleVibration()
    })
    act(() => {
      result.current.vibrate(15)
    })

    expect(vibrateMock).not.toHaveBeenCalled()
  })

  it('does not call navigator.vibrate when unsupported (iOS Safari)', () => {
    // @ts-expect-error -- simulate an unsupported browser
    delete navigator.vibrate

    const { result } = renderHook(() => useVibrationPreference())

    expect(() => {
      act(() => {
        result.current.vibrate(15)
      })
    }).not.toThrow()
    expect(vibrateMock).not.toHaveBeenCalled()
  })

  it('isSupported is true when navigator.vibrate exists', () => {
    const { result } = renderHook(() => useVibrationPreference())

    expect(result.current.isSupported).toBe(true)
  })

  it('isSupported is false when navigator.vibrate is unavailable (iOS Safari)', () => {
    // @ts-expect-error -- simulate an unsupported browser
    delete navigator.vibrate

    const { result } = renderHook(() => useVibrationPreference())

    expect(result.current.isSupported).toBe(false)
  })
})
