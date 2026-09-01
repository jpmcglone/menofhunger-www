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

  it('shares one volume level across players, defaulting to full volume and muted', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'composables/useEmbeddedVideoManager.ts'),
      'utf8',
    )
    expect(src).toContain("useState<number>('moh.app-video-volume', () => 1)")
    expect(src).toContain("useState<boolean>('moh.app-video-sound-on', () => false)")
    expect(src).toContain('function reportPlayerAudio')
    expect(src).toContain('function applySharedAudioToVideo')
    const grid = readFileSync(resolve(process.cwd(), 'components/app/PostMediaGrid.vue'), 'utf8')
    const lightbox = readFileSync(resolve(process.cwd(), 'components/app/ImageLightbox.vue'), 'utf8')
    expect(grid).toContain('reportPlayerAudio')
    expect(grid).toContain('applySharedAudioToVideo')
    expect(lightbox).toContain('reportPlayerAudio')
    expect(lightbox).toContain('applySharedAudioToVideo')
  })
})
