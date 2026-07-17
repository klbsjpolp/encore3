import { useCallback, useEffect, useState } from 'react'

const loadStoredToggle = (storageKey: string): boolean => {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === null) {
      return true
    }

    return JSON.parse(stored) === true
  } catch {
    return true
  }
}

const saveStoredToggle = (storageKey: string, enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(enabled))
  } catch {
    // Ignore storage write errors (private mode, quota exceeded, etc.).
  }
}

// A boolean preference that defaults to on and persists to localStorage.
export const usePersistedToggle = (storageKey: string) => {
  const [enabled, setEnabled] = useState<boolean>(() => loadStoredToggle(storageKey))

  useEffect(() => {
    saveStoredToggle(storageKey, enabled)
  }, [storageKey, enabled])

  const toggle = useCallback(() => {
    setEnabled((previousEnabled) => !previousEnabled)
  }, [])

  return [enabled, toggle] as const
}
