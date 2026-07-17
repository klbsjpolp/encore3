import { useCallback, useEffect, useState } from 'react'

import { isVibrationSupported } from '@/lib/vibration'

const VIBRATION_STORAGE_KEY = 'encore:vibration:v1'

const loadStoredVibrationEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const stored = window.localStorage.getItem(VIBRATION_STORAGE_KEY)
    if (stored === null) {
      return true
    }

    return JSON.parse(stored) === true
  } catch {
    return true
  }
}

const saveStoredVibrationEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(VIBRATION_STORAGE_KEY, JSON.stringify(enabled))
  } catch {
    // Ignore storage write errors (private mode, quota exceeded, etc.).
  }
}

export const useVibrationPreference = () => {
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() =>
    loadStoredVibrationEnabled(),
  )
  const [isSupported] = useState<boolean>(() => isVibrationSupported())

  useEffect(() => {
    saveStoredVibrationEnabled(vibrationEnabled)
  }, [vibrationEnabled])

  const toggleVibration = useCallback(() => {
    setVibrationEnabled((previousEnabled) => !previousEnabled)
  }, [])

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
