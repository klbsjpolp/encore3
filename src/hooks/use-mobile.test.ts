import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  it('reports mobile below the 1024px breakpoint so tablets get the compact layout', () => {
    window.resizeTo(900, 800)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('reports desktop from 1024px where the lg grid layout applies', () => {
    window.resizeTo(1024, 800)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })
})
