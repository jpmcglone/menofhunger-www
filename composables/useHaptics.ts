type VibrationPattern = number | number[]

function vibrate(pattern: VibrationPattern) {
  try {
    if (typeof navigator === 'undefined') return
    if (!('vibrate' in navigator)) return
    navigator.vibrate?.(pattern)
  } catch {
    // ignore (best-effort)
  }
}

export function useHaptics() {
  function tap() {
    vibrate(10)
  }
  return { tap }
}

