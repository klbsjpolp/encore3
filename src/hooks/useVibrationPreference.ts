import { useCallback, useState } from 'react'

import { isVibrationSupported } from '@/lib/vibration'

import { usePersistedToggle } from './usePersistedToggle'

const VIBRATION_STORAGE_KEY = 'encore:vibration:v1'

export const useVibrationPreference = () => {
  const [vibrationEnabled, toggleVibration] = usePersistedToggle(VIBRATION_STORAGE_KEY)
  const [isSupported] = useState<boolean>(() => isVibrationSupported())

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!vibrationEnabled || !isSupported) {
        return
      }

      navigator.vibrate(pattern)
    },
    [vibrationEnabled, isSupported],
  )

  return { vibrationEnabled, toggleVibration, vibrate, isSupported }
}
