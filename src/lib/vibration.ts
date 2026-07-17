// Short buzz to acknowledge a dice roll, longer double-pulse to confirm a placement.
export const VIBRATION_PATTERNS = {
  roll: 15,
  confirm: [20, 30, 20],
}

export const isVibrationSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'vibrate' in navigator
