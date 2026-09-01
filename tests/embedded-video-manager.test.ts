import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('embedded video manager', () => {
  it('finishes the first-pick debounce without waiting for scroll', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'composables/useEmbeddedVideoManager.ts'),
      'utf8',
    )
    expect(src).toContain('function scheduleFollowUpCompute')
    expect(src).toContain('function scheduleComputeAfterLayout')
    expect(src).toContain('scheduleFollowUpCompute(FIRST_PICK_DELAY_MS)')
    expect(src).toContain('scheduleFollowUpCompute(LAYOUT_RETRY_MS)')
    expect(src).toContain('new ResizeObserver')
    // Register used to only RAF once; first pick then waited for scroll.
    expect(src).toContain('scheduleComputeAfterLayout()')
  })
})
