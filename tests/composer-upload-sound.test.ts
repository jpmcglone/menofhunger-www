import { effectScope, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useComposerUploads } from '../composables/composer/useComposerUploads'
import type { ComposerMediaItem } from '../composables/composer/types'

const sounds = vi.hoisted(() => ({ play: vi.fn() }))
mockNuxtImport('useActionSounds', () => () => sounds)
beforeEach(() => { vi.useFakeTimers(); sounds.play.mockReset() })
afterEach(() => vi.useRealTimers())

function upload() {
  const scope = effectScope()
  const media = ref<ComposerMediaItem[]>([{
    localId: 'video', source: 'upload', kind: 'video', previewUrl: '', uploadStatus: 'queued',
    file: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
  }])
  let finish = (_: unknown) => {}
  let fail = (_: Error) => {}
  const api = vi.fn().mockImplementation((path: string) => path.endsWith('/init')
    ? Promise.resolve({ key: 'video', skipUpload: true })
    : new Promise((resolve, reject) => { finish = resolve; fail = reject }))
  const queue = scope.run(() => useComposerUploads({
    composerMedia: media,
    patchComposerMedia: (id, patch) => { const item = media.value.find(m => m.localId === id); if (item) Object.assign(item, patch) },
    apiFetchData: api,
  }))!
  queue.processUploadQueue()
  return { scope, media, finish: () => finish({ key: 'video', kind: 'video' }), fail: () => fail(new Error('Upload failed')) }
}

describe('upload ready feedback', () => {
  it('sounds once after a slow successful batch is committed', async () => {
    const task = upload()
    await vi.advanceTimersByTimeAsync(3001)
    task.finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(sounds.play).toHaveBeenCalledOnce()
    expect(sounds.play.mock.calls[0]![0]).toBe('upload-ready')
    expect(sounds.play.mock.calls[0]![1].valid()).toBe(true)
    task.scope.stop()
    expect(sounds.play.mock.calls[0]![1].valid()).toBe(false)
  })
  it('skips the sound for an instant upload', async () => {
    const task = upload()
    await vi.advanceTimersByTimeAsync(1)
    task.finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(sounds.play).not.toHaveBeenCalled()
    task.scope.stop()
  })
  it('stays silent after failure', async () => {
    const task = upload()
    await vi.advanceTimersByTimeAsync(3001)
    task.fail()
    await vi.advanceTimersByTimeAsync(0)
    expect(sounds.play).not.toHaveBeenCalled()
    task.scope.stop()
  })
  it('stays silent when the uploaded item was removed', async () => {
    const task = upload()
    await vi.advanceTimersByTimeAsync(3001)
    task.media.value = []
    task.finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(sounds.play).not.toHaveBeenCalled()
    task.scope.stop()
  })
})
