import { describe, expect, it } from 'vitest'
import { effectScope, ref, watchEffect } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePostCache } from '~/composables/usePostCache'
import type { FeedPost } from '~/types/api'

const postCacheState = ref<Record<string, Partial<FeedPost>>>({})
mockNuxtImport('useState', () => () => postCacheState)

describe('post cache update isolation', () => {
  it('notifies only the changed post among 500 readers', () => {
    postCacheState.value = {}
    const cache = usePostCache()
    const posts = Array.from({ length: 500 }, (_, i) => ({ id: String(i), boostCount: 0 }) as FeedPost)
    cache.ingest(posts)
    const scope = effectScope()
    let reads = 0
    scope.run(() => posts.forEach((post) => watchEffect(() => {
      cache.get(post)
      reads++
    }, { flush: 'sync' })))
    reads = 0
    cache.patch('0', { boostCount: 1 })
    expect(reads).toBe(1)
    expect(cache.get(posts[0]!).boostCount).toBe(1)
    reads = 0
    cache.clear(['0'])
    expect(reads).toBe(1)
    expect(cache.get(posts[0]!).boostCount).toBe(0)
    scope.stop()
  })

  it('keeps parent overlays reactive without notifying unrelated posts', () => {
    postCacheState.value = {}
    const cache = usePostCache()
    const parent = { id: 'parent', boostCount: 0 } as FeedPost
    const reply = { id: 'reply', parent } as FeedPost
    let count = -1
    const scope = effectScope()
    scope.run(() => watchEffect(() => { count = cache.get(reply).parent!.boostCount }, { flush: 'sync' }))
    cache.patch('parent', { boostCount: 2 })
    expect(count).toBe(2)
    scope.stop()
  })
})
