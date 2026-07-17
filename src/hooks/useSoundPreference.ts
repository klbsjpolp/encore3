import { useCallback, useEffect, useState } from 'react'

import { isSoundSupported, playSoundEffect, type SoundEffect } from '@/lib/sound'

const SOUND_STORAGE_KEY = 'encore:sound:v1'

const loadStoredSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const stored = window.localStorage.getItem(SOUND_STORAGE_KEY)
    if (stored === null) {
      return true
    }

    return JSON.parse(stored) === true
  } catch {
    return true
  }
}

const saveStoredSoundEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(enabled))
  } catch {
    // Ignore storage write errors (private mode, quota exceeded, etc.).
  }
}

export const useSoundPreference = () => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadStoredSoundEnabled())
  const [isSupported] = useState<boolean>(() => isSoundSupported())

  useEffect(() => {
    saveStoredSoundEnabled(soundEnabled)
  }, [soundEnabled])

  const toggleSound = useCallback(() => {
    setSoundEnabled((previousEnabled) => !previousEnabled)
  }, [])

  const playSound = useCallback(
    (effect: SoundEffect) => {
      if (!soundEnabled || !isSupported) {
        return
      }

      playSoundEffect(effect)
    },
    [soundEnabled, isSupported],
  )

  return { soundEnabled, toggleSound, playSound, isSupported }
}
