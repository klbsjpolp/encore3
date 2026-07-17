export type SoundEffect = 'roll' | 'confirm'

export const isSoundSupported = (): boolean =>
  typeof window !== 'undefined' && 'AudioContext' in window

// Sounds are synthesized on the fly instead of shipping audio files, so there's
// nothing to load and no asset to keep in sync with the two effects below.
let audioContext: AudioContext | null = null

const getAudioContext = (): AudioContext | null => {
  if (!isSoundSupported()) {
    return null
  }
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  return audioContext
}

const random = (min: number, max: number): number => min + Math.random() * (max - min)

// White noise shaped sample by sample, so each effect can carry its own
// amplitude contour rather than a single generic fade.
const createNoiseBuffer = (
  context: AudioContext,
  duration: number,
  shape: (progress: number) => number,
): AudioBuffer => {
  const length = Math.max(1, Math.round(context.sampleRate * duration))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * shape(i / length)
  }
  return buffer
}

// One die knocking against a hard surface: a sharp broadband tick for the
// contact itself, plus a short tone for the cube's body ringing afterwards.
// The tick alone reads as a mouse click; it's the body tone that makes it
// sound like an object.
const playDieImpact = (context: AudioContext, time: number, gain: number): void => {
  const tickDuration = 0.012
  const tick = context.createBufferSource()
  tick.buffer = createNoiseBuffer(context, tickDuration, (progress) => (1 - progress) ** 3)

  const tickFilter = context.createBiquadFilter()
  tickFilter.type = 'bandpass'
  tickFilter.frequency.value = random(2600, 5200)
  tickFilter.Q.value = 1.2

  const tickGain = context.createGain()
  tickGain.gain.value = gain * 0.55

  tick.connect(tickFilter)
  tickFilter.connect(tickGain)
  tickGain.connect(context.destination)
  tick.start(time)
  tick.stop(time + tickDuration)

  const bodyDuration = random(0.05, 0.095)
  const body = context.createOscillator()
  body.type = 'triangle'
  body.frequency.value = random(280, 700)

  const bodyGain = context.createGain()
  bodyGain.gain.setValueAtTime(gain, time)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + bodyDuration)

  body.connect(bodyGain)
  bodyGain.connect(context.destination)
  body.start(time)
  body.stop(time + bodyDuration)
}

const ROLL_IMPACT_COUNT = 13

// Dice tumbling and settling, over roughly a second: impacts start dense and
// spread out as the dice lose energy, quieting down as they come to rest.
const playRollSound = (context: AudioContext): void => {
  let time = context.currentTime
  for (let i = 0; i < ROLL_IMPACT_COUNT; i++) {
    const progress = i / (ROLL_IMPACT_COUNT - 1)
    playDieImpact(context, time, 0.28 * (1 - progress * 0.65))
    // Jittered so the rhythm never sounds mechanical, and growing with
    // progress so the dice audibly slow to a stop.
    time += random(0.028, 0.05) + progress * 0.06
  }
}

interface ScratchStrokeOptions {
  time: number
  duration: number
  fromFrequency: number
  toFrequency: number
  gain: number
}

// One stroke of a marker dragged across a box: friction noise that brightens
// as the stroke picks up speed, roughened by the grain of the paper.
const playScratchStroke = (context: AudioContext, options: ScratchStrokeOptions): void => {
  const { time, duration, fromFrequency, toFrequency, gain } = options

  const source = context.createBufferSource()
  source.buffer = createNoiseBuffer(context, duration, (progress) => {
    // The shape of a hand pressing down, dragging, then lifting.
    const attack = Math.min(1, progress / 0.12)
    const release = Math.min(1, (1 - progress) / 0.35)
    // Coarse wobble, slow enough to be heard as texture rather than hiss.
    const grain = 0.72 + 0.28 * Math.abs(Math.sin(progress * Math.PI * 9))
    return attack * release * grain
  })

  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.1
  filter.frequency.setValueAtTime(fromFrequency, time)
  filter.frequency.exponentialRampToValueAtTime(toFrequency, time + duration)

  const gainNode = context.createGain()
  gainNode.gain.value = gain

  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(context.destination)
  source.start(time)
  source.stop(time + duration)
}

// Crossing out a box: two quick strokes, matching the X the board draws over
// a claimed square. The second stroke sweeps the other way, as a backhand
// stroke would.
const playConfirmSound = (context: AudioContext): void => {
  const now = context.currentTime
  playScratchStroke(context, {
    time: now,
    duration: 0.13,
    fromFrequency: 1400,
    toFrequency: 3200,
    gain: 0.22,
  })
  playScratchStroke(context, {
    time: now + 0.1,
    duration: 0.12,
    fromFrequency: 3000,
    toFrequency: 1600,
    gain: 0.18,
  })
}

export const playSoundEffect = (effect: SoundEffect): void => {
  const context = getAudioContext()
  if (!context) {
    return
  }

  if (effect === 'roll') {
    playRollSound(context)
  } else {
    playConfirmSound(context)
  }
}
