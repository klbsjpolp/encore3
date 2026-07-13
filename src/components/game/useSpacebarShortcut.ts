import { useEffect } from 'react'

interface UseSpacebarShortcutOptions {
  // Roll button is highlighted and ready to trigger.
  canRoll: boolean
  onRoll: () => void
  // Confirm button is highlighted and ready to trigger.
  canConfirm: boolean
  onConfirm: () => void
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  // Let the browser handle Space natively on form fields and focusable
  // controls, which also avoids firing a shortcut twice when a button is
  // focused (native activation + this handler).
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A' ||
    target.isContentEditable
  )
}

/**
 * Triggers the highlighted primary action with the spacebar: "Lancer les dés"
 * when the roll button is highlighted, or "Confirmer le placement" when the
 * confirm button is highlighted.
 */
export const useSpacebarShortcut = ({
  canRoll,
  onRoll,
  canConfirm,
  onConfirm,
}: UseSpacebarShortcutOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') {
        return
      }
      if (event.repeat || isEditableTarget(event.target)) {
        return
      }
      if (canRoll) {
        event.preventDefault()
        onRoll()
      } else if (canConfirm) {
        event.preventDefault()
        onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canRoll, onRoll, canConfirm, onConfirm])
}
