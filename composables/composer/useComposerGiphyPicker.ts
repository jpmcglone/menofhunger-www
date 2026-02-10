import type { Ref } from 'vue'
import type { GiphyItem, GiphySearchResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import type { ComposerMediaItem } from './types'
import { makeLocalId } from './types'

export function useComposerGiphyPicker(opts: {
  composerMedia: Ref<ComposerMediaItem[]>
  canAddMoreMedia: Ref<boolean>
  apiFetchData: <T>(url: string, init: any) => Promise<T>
}) {
  const giphyOpen = ref(false)
  const giphyQuery = ref('')
  const giphyLoading = ref(false)
  const giphyError = ref<string | null>(null)
  const giphyItems = ref<GiphySearchResponse>([])
  const giphyInputRef = ref<any>(null)
  const giphyRequestId = ref(0)
  let giphyInflight: AbortController | null = null

  function resetState() {
    giphyQuery.value = ''
    giphyItems.value = []
    giphyError.value = null
    giphyLoading.value = false
    if (giphyInflight) {
      try {
        giphyInflight.abort()
      } catch {
        // ignore
      }
      giphyInflight = null
    }
  }

  function focusInput() {
    if (!import.meta.client) return
    try {
      const root = (giphyInputRef.value?.$el ?? giphyInputRef.value) as HTMLElement | null
      const input =
        (root?.tagName === 'INPUT'
          ? (root as HTMLInputElement)
          : (root?.querySelector?.('input') as HTMLInputElement | null)) ?? null
      input?.focus()
      input?.select?.()
    } catch {
      // ignore
    }
  }

  function openGiphyPicker(initialQuery?: string) {
    if (!opts.canAddMoreMedia.value) return
    resetState()
    const initial = (initialQuery ?? '').trim().slice(0, 120)
    if (initial) giphyQuery.value = initial
    giphyOpen.value = true
    void nextTick().then(() => focusInput())
    void searchGiphy()
  }

  async function searchGiphy() {
    const q = giphyQuery.value.trim()
    giphyLoading.value = true
    const reqId = ++giphyRequestId.value
    if (giphyInflight) {
      try {
        giphyInflight.abort()
      } catch {
        // ignore
      }
      giphyInflight = null
    }
    const controller = new AbortController()
    giphyInflight = controller
    try {
      const res = q
        ? await opts.apiFetchData<GiphySearchResponse>('/giphy/search', { method: 'GET', query: { q }, signal: controller.signal })
        : await opts.apiFetchData<GiphySearchResponse>('/giphy/trending', { method: 'GET', query: { limit: 24 }, signal: controller.signal })
      if (!giphyOpen.value || giphyRequestId.value !== reqId) return
      giphyItems.value = Array.isArray(res) ? res : []
      giphyError.value = null
    } catch (e: unknown) {
      if ((e as any)?.name === 'AbortError') return
      if (!giphyOpen.value || giphyRequestId.value !== reqId) return
      giphyError.value = getApiErrorMessage(e) || (q ? 'Failed to search Giphy.' : 'Failed to load trending GIFs.')
      giphyItems.value = []
    } finally {
      if (giphyInflight === controller) giphyInflight = null
      if (giphyRequestId.value === reqId) giphyLoading.value = false
    }
  }

  function selectGiphyGif(gif: GiphyItem) {
    if (!opts.canAddMoreMedia.value) return
    const url = (gif?.url ?? '').trim()
    if (!url) return
    const title = (gif?.title ?? '').trim()
    opts.composerMedia.value.push({
      localId: makeLocalId(),
      source: 'giphy',
      kind: 'gif',
      previewUrl: url,
      altText: title || null,
      url,
      mp4Url: gif.mp4Url ?? null,
      width: gif.width ?? null,
      height: gif.height ?? null,
      uploadStatus: 'done',
      uploadError: null,
      file: null,
      abortController: null,
    })
    giphyOpen.value = false
  }

  watch(
    giphyOpen,
    (open) => {
      if (!open) {
        giphyRequestId.value += 1
        resetState()
      }
    },
    { flush: 'post' },
  )

  return {
    giphyOpen,
    giphyQuery,
    giphyLoading,
    giphyError,
    giphyItems,
    giphyInputRef,
    openGiphyPicker,
    searchGiphy,
    selectGiphyGif,
  }
}

