import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePersistedToggle } from './usePersistedToggle'

const STORAGE_KEY = 'encore:test-toggle:v1'

describe('usePersistedToggle', () => {
  it('defaults to enabled when nothing is stored', () => {
    const { result } = renderHook(() => usePersistedToggle(STORAGE_KEY))

    expect(result.current[0]).toBe(true)
  })

  it('persists the toggle and restores it on the next mount', () => {
    const { result } = renderHook(() => usePersistedToggle(STORAGE_KEY))

    act(() => {
      result.current[1]()
    })

    expect(result.current[0]).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')

    const { result: restored } = renderHook(() => usePersistedToggle(STORAGE_KEY))
    expect(restored.current[0]).toBe(false)
  })

  it('falls back to enabled when the stored value is not valid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    const { result } = renderHook(() => usePersistedToggle(STORAGE_KEY))

    expect(result.current[0]).toBe(true)
  })

  it('keeps separate keys independent', () => {
    const { result: a } = renderHook(() => usePersistedToggle('encore:test-a:v1'))
    const { result: b } = renderHook(() => usePersistedToggle('encore:test-b:v1'))

    act(() => {
      a.current[1]()
    })

    expect(a.current[0]).toBe(false)
    expect(b.current[0]).toBe(true)
  })
})
