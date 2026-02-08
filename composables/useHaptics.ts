type VibrationPattern = number | number[]

function vibrate(pattern: VibrationPattern) {
  try {
    if (typeof navigator === 'undefined') return
    if (!('vibrate' in navigator)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(navigator as any).vibrate?.(pattern)
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

