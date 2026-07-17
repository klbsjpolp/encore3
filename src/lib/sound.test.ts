import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isSoundSupported, playSoundEffect } from './sound'

class MockAudioParam {
  value = 0
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
  linearRampToValueAtTime = vi.fn()
}

class MockAudioNode {
  connect = vi.fn()
}

class MockBufferSource extends MockAudioNode {
  buffer: AudioBuffer | null = null
  start = vi.fn()
  stop = vi.fn()
}

class MockOscillator extends MockAudioNode {
  type = ''
  frequency = new MockAudioParam()
  start = vi.fn()
  stop = vi.fn()
}

class MockBiquadFilter extends MockAudioNode {
  type = ''
  frequency = new MockAudioParam()
  Q = new MockAudioParam()
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam()
}

class MockAudioContext {
  static instances: MockAudioContext[] = []

  state: 'running' | 'suspended' = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = {}
  resume = vi.fn().mockResolvedValue(undefined)
  createBuffer = vi.fn((_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  }))
  createBufferSource = vi.fn(() => new MockBufferSource())
  createOscillator = vi.fn(() => new MockOscillator())
  createBiquadFilter = vi.fn(() => new MockBiquadFilter())
  createGain = vi.fn(() => new MockGainNode())

  constructor() {
    MockAudioContext.instances.push(this)
  }
}

// The AudioContext is a module-level singleton, so tests share the instance
// created by whichever call came first.
const getContext = (): MockAudioContext => MockAudioContext.instances[0]

const getSources = (): MockBufferSource[] =>
  getContext().createBufferSource.mock.results.map((result) => result.value as MockBufferSource)

// The end of the effect: the latest moment any of its sources is scheduled
// to stop.
const getEffectDuration = (): number =>
  Math.max(...getSources().map((source) => source.stop.mock.calls[0][0] as number))

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
    MockAudioContext.instances.forEach((instance) => {
      instance.createBufferSource.mockClear()
      instance.createOscillator.mockClear()
      instance.createBiquadFilter.mockClear()
      instance.createGain.mockClear()
    })
  })

  it('does not throw when unsupported', () => {
    // @ts-expect-error -- simulate an unsupported browser
    delete window.AudioContext

    expect(() => playSoundEffect('roll')).not.toThrow()
  })

  it('plays the roll as a long run of impacts rather than a couple of clicks', () => {
    playSoundEffect('roll')

    expect(getSources().length).toBeGreaterThanOrEqual(10)
    expect(getEffectDuration()).toBeGreaterThan(0.6)
  })

  it('gives every roll impact a resonant body tone, not just a click', () => {
    playSoundEffect('roll')

    const context = getContext()
    expect(context.createOscillator).toHaveBeenCalledTimes(
      context.createBufferSource.mock.calls.length,
    )
  })

  it('spaces roll impacts further apart as the dice slow down', () => {
    playSoundEffect('roll')

    const startTimes = getSources().map((source) => source.start.mock.calls[0][0] as number)
    const gaps = startTimes.slice(1).map((time, index) => time - startTimes[index])
    const firstGap = gaps[0]
    const lastGap = gaps[gaps.length - 1]

    expect(lastGap).toBeGreaterThan(firstGap)
  })

  it('plays the confirm as two scratch strokes, matching the X drawn on the board', () => {
    playSoundEffect('confirm')

    expect(getSources()).toHaveLength(2)
  })

  it('sweeps the filter across each confirm stroke', () => {
    playSoundEffect('confirm')

    const filters = getContext().createBiquadFilter.mock.results.map(
      (result) => result.value as MockBiquadFilter,
    )
    const sweptFilters = filters.filter(
      (filter) => filter.frequency.exponentialRampToValueAtTime.mock.calls.length > 0,
    )

    expect(sweptFilters).toHaveLength(2)
  })
})
