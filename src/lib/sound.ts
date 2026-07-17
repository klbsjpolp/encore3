export type SoundEffect = 'roll' | 'confirm'

export const isSoundSupported = (): boolean =>
  typeof window !== 'undefined' && 'AudioContext' in window

// Sounds are synthesized on the fly (short filtered noise bursts) instead of
// shipping audio files, so there's nothing to load and no asset to keep in
// sync with the two effects below.
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

interface NoiseBurstOptions {
  startTime: number
  duration: number
  frequency: number
  gain: number
}

const playNoiseBurst = (context: AudioContext, options: NoiseBurstOptions): void => {
  const { startTime, duration, frequency, gain } = options
  const bufferSize = Math.max(1, Math.round(context.sampleRate * duration))
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    // Fade the noise out across the burst so it reads as a percussive tick
    // rather than an abrupt buzz.
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const source = context.createBufferSource()
  source.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 6

  const gainNode = context.createGain()
  gainNode.gain.value = gain

  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(context.destination)

  source.start(startTime)
  source.stop(startTime + duration)
}

// A handful of quick clicks, like dice tumbling in a cup.
const playRollSound = (context: AudioContext): void => {
  const clickCount = 4
  for (let i = 0; i < clickCount; i++) {
    playNoiseBurst(context, {
      startTime: context.currentTime + i * 0.045 + Math.random() * 0.01,
      duration: 0.02,
      frequency: 1800 + Math.random() * 800,
      gain: 0.25,
    })
  }
}

// A single longer, lower-pitched burst — reads as a marker striking through
// a box, to match the "scratch" placement action.
const playConfirmSound = (context: AudioContext): void => {
  playNoiseBurst(context, {
    startTime: context.currentTime,
    duration: 0.16,
    frequency: 1200,
    gain: 0.3,
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
