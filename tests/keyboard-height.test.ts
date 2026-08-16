import { describe, expect, it } from 'vitest'
import { inferredKeyboardHeight, KEYBOARD_OPEN_MIN_PX } from '../composables/useKeyboardHeight'

describe('inferredKeyboardHeight', () => {
  it('ignores iOS Safari chrome-sized viewport shrinks', () => {
    expect(inferredKeyboardHeight({
      baselineHeight: 800,
      viewportHeight: 800 - 80,
      virtualKeyboardHeight: 0,
      coarsePointer: true,
    })).toBe(0)
    expect(inferredKeyboardHeight({
      baselineHeight: 800,
      viewportHeight: 800 - 150,
      virtualKeyboardHeight: 0,
      coarsePointer: true,
    })).toBe(0)
    expect(KEYBOARD_OPEN_MIN_PX).toBeGreaterThan(150)
  })

  it('treats a real software keyboard as open', () => {
    expect(inferredKeyboardHeight({
      baselineHeight: 800,
      viewportHeight: 800 - 280,
      virtualKeyboardHeight: 0,
      coarsePointer: true,
    })).toBe(280)
  })

  it('uses the VirtualKeyboard API height when it is large enough', () => {
    expect(inferredKeyboardHeight({
      baselineHeight: 800,
      viewportHeight: 800,
      virtualKeyboardHeight: 300,
      coarsePointer: true,
    })).toBe(300)
  })

  it('does not treat desktop window resizes as a keyboard', () => {
    expect(inferredKeyboardHeight({
      baselineHeight: 900,
      viewportHeight: 500,
      virtualKeyboardHeight: 0,
      coarsePointer: false,
    })).toBe(0)
  })
})
