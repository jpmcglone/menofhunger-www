/** The browser's AudioContext constructor (Safari < 14.1 only exposes `webkitAudioContext`), or null when unsupported. */
export function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null
}
