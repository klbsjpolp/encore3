import { useCallback, useState } from 'react'

import { isSoundSupported, playSoundEffect, type SoundEffect } from '@/lib/sound'

import { usePersistedToggle } from './usePersistedToggle'

const SOUND_STORAGE_KEY = 'encore:sound:v1'

export const useSoundPreference = () => {
  const [soundEnabled, toggleSound] = usePersistedToggle(SOUND_STORAGE_KEY)
  const [isSupported] = useState<boolean>(() => isSoundSupported())

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
