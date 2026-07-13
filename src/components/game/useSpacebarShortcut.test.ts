import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSpacebarShortcut } from './useSpacebarShortcut'

const pressSpace = (target?: EventTarget) => {
  const event = new KeyboardEvent('keydown', {
    code: 'Space',
    key: ' ',
    bubbles: true,
    cancelable: true,
  })
  if (target) {
    target.dispatchEvent(event)
  } else {
    window.dispatchEvent(event)
  }
  return event
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSpacebarShortcut', () => {
  it('rolls the dice when the roll action is highlighted', () => {
    const onRoll = vi.fn()
    const onConfirm = vi.fn()
    renderHook(() => useSpacebarShortcut({ canRoll: true, onRoll, canConfirm: false, onConfirm }))

    pressSpace()

    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms the placement when the confirm action is highlighted', () => {
    const onRoll = vi.fn()
    const onConfirm = vi.fn()
    renderHook(() => useSpacebarShortcut({ canRoll: false, onRoll, canConfirm: true, onConfirm }))

    pressSpace()

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onRoll).not.toHaveBeenCalled()
  })

  it('prefers rolling over confirming when both are highlighted', () => {
    const onRoll = vi.fn()
    const onConfirm = vi.fn()
    renderHook(() => useSpacebarShortcut({ canRoll: true, onRoll, canConfirm: true, onConfirm }))

    pressSpace()

    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does nothing when no action is highlighted', () => {
    const onRoll = vi.fn()
    const onConfirm = vi.fn()
    renderHook(() => useSpacebarShortcut({ canRoll: false, onRoll, canConfirm: false, onConfirm }))

    pressSpace()

    expect(onRoll).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('ignores the spacebar while typing in a form field', () => {
    const onRoll = vi.fn()
    const onConfirm = vi.fn()
    renderHook(() => useSpacebarShortcut({ canRoll: true, onRoll, canConfirm: false, onConfirm }))

    const input = document.createElement('input')
    document.body.appendChild(input)
    pressSpace(input)
    input.remove()

    expect(onRoll).not.toHaveBeenCalled()
  })

  it('ignores the spacebar when a button is focused to avoid double activation', () => {
    const onConfirm = vi.fn()
    renderHook(() =>
      useSpacebarShortcut({ canRoll: false, onRoll: vi.fn(), canConfirm: true, onConfirm }),
    )

    const button = document.createElement('button')
    document.body.appendChild(button)
    pressSpace(button)
    button.remove()

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('prevents default page scrolling when it handles the spacebar', () => {
    renderHook(() =>
      useSpacebarShortcut({
        canRoll: true,
        onRoll: vi.fn(),
        canConfirm: false,
        onConfirm: vi.fn(),
      }),
    )

    const event = pressSpace()

    expect(event.defaultPrevented).toBe(true)
  })

  it('removes the listener on unmount', () => {
    const onRoll = vi.fn()
    const { unmount } = renderHook(() =>
      useSpacebarShortcut({ canRoll: true, onRoll, canConfirm: false, onConfirm: vi.fn() }),
    )

    unmount()
    pressSpace()

    expect(onRoll).not.toHaveBeenCalled()
  })
})
