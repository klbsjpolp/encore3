import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isSoundSupported, playSoundEffect } from '@/lib/sound'

import { useSoundPreference } from './useSoundPreference'

vi.mock('@/lib/sound', () => ({
  isSoundSupported: vi.fn(),
  playSoundEffect: vi.fn(),
}))

const STORAGE_KEY = 'encore:sound:v1'

describe('useSoundPreference', () => {
  beforeEach(() => {
    vi.mocked(isSoundSupported).mockReturnValue(true)
    vi.mocked(playSoundEffect).mockClear()
  })

  it('starts enabled by default when nothing is stored', () => {
    const { result } = renderHook(() => useSoundPreference())

    expect(result.current.soundEnabled).toBe(true)
  })

  it('persists the toggle and restores it on the next mount', () => {
    const { result } = renderHook(() => useSoundPreference())

    act(() => {
      result.current.toggleSound()
    })

    expect(result.current.soundEnabled).toBe(false)

    const { result: restored } = renderHook(() => useSoundPreference())
    expect(restored.current.soundEnabled).toBe(false)
  })

  it('falls back to enabled when the stored value is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    const { result } = renderHook(() => useSoundPreference())

    expect(result.current.soundEnabled).toBe(true)
  })

  it('plays the sound effect when enabled and supported', () => {
    const { result } = renderHook(() => useSoundPreference())

    act(() => {
      result.current.playSound('roll')
    })

    expect(playSoundEffect).toHaveBeenCalledWith('roll')
  })

  it('does not play when disabled', () => {
    const { result } = renderHook(() => useSoundPreference())

    act(() => {
      result.current.toggleSound()
    })
    act(() => {
      result.current.playSound('roll')
    })

    expect(playSoundEffect).not.toHaveBeenCalled()
  })

  it('does not play when unsupported', () => {
    vi.mocked(isSoundSupported).mockReturnValue(false)
    const { result } = renderHook(() => useSoundPreference())

    act(() => {
      result.current.playSound('roll')
    })

    expect(playSoundEffect).not.toHaveBeenCalled()
  })

  it('isSupported reflects lib/sound isSoundSupported()', () => {
    vi.mocked(isSoundSupported).mockReturnValue(false)
    const { result } = renderHook(() => useSoundPreference())

    expect(result.current.isSupported).toBe(false)
  })
})
