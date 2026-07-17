import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isSoundSupported, playSoundEffect } from './sound'

class MockAudioNode {
  connect = vi.fn()
}

class MockBufferSource extends MockAudioNode {
  buffer: unknown = null
  start = vi.fn()
  stop = vi.fn()
}

class MockBiquadFilter extends MockAudioNode {
  type = ''
  frequency = { value: 0 }
  Q = { value: 0 }
}

class MockGainNode extends MockAudioNode {
  gain = { value: 0 }
}

class MockAudioContext {
  static instances: MockAudioContext[] = []

  state: 'running' | 'suspended' = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = {}
  resume = vi.fn().mockResolvedValue(undefined)
  createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(1) }))
  createBufferSource = vi.fn(() => new MockBufferSource())
  createBiquadFilter = vi.fn(() => new MockBiquadFilter())
  createGain = vi.fn(() => new MockGainNode())

  constructor() {
    MockAudioContext.instances.push(this)
  }
}

describe('isSoundSupported', () => {
  afterEach(() => {
    // @ts-expect-error -- cleanup of the test-only stub
    delete window.AudioContext
  })

  it('returns true when AudioContext exists', () => {
    // @ts-expect-error -- test-only stub
    window.AudioContext = MockAudioContext

    expect(isSoundSupported()).toBe(true)
  })

  it('returns false when AudioContext is absent', () => {
    // @ts-expect-error -- simulate an unsupported browser
    delete window.AudioContext

    expect(isSoundSupported()).toBe(false)
  })
})

describe('playSoundEffect', () => {
  beforeEach(() => {
    // @ts-expect-error -- test-only stub
    window.AudioContext = MockAudioContext
    MockAudioContext.instances.forEach((instance) => instance.createBufferSource.mockClear())
  })

  it('does not throw when unsupported', () => {
    // @ts-expect-error -- simulate an unsupported browser
    delete window.AudioContext

    expect(() => playSoundEffect('roll')).not.toThrow()
  })

  it('plays several noise bursts for the roll sound', () => {
    playSoundEffect('roll')

    const [context] = MockAudioContext.instances
    expect(context.createBufferSource.mock.calls.length).toBeGreaterThan(1)
  })

  it('plays a single noise burst for the confirm sound', () => {
    playSoundEffect('confirm')

    const [context] = MockAudioContext.instances
    expect(context.createBufferSource).toHaveBeenCalledTimes(1)
  })
})
