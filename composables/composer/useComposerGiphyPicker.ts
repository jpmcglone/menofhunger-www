import type { Ref } from 'vue'
import type { GiphySearchResponse } from '~/types/api'
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
  const giphyItems = ref<GiphySearchResponse['items']>([])
  const giphyInputRef = ref<any>(null)
  const giphyRequestId = ref(0)

  function resetState() {
    giphyQuery.value = ''
    giphyItems.value = []
    giphyError.value = null
    giphyLoading.value = false
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

  function openGiphyPicker() {
    if (!opts.canAddMoreMedia.value) return
    resetState()
    giphyOpen.value = true
    void nextTick().then(() => focusInput())
    void searchGiphy()
  }

  async function searchGiphy() {
    if (giphyLoading.value) return
    const q = giphyQuery.value.trim()
    giphyLoading.value = true
    const reqId = ++giphyRequestId.value
    try {
      const query = q ? ({ q } as Record<string, string>) : ({} as Record<string, string>)
      const res = await opts.apiFetchData<GiphySearchResponse>('/giphy/search', { method: 'GET', query: query as any })
      if (!giphyOpen.value || giphyRequestId.value !== reqId) return
      giphyItems.value = res?.items ?? []
      giphyError.value = null
    } catch (e: unknown) {
      if (!giphyOpen.value || giphyRequestId.value !== reqId) return
      giphyError.value = getApiErrorMessage(e) || 'Failed to search Giphy.'
      giphyItems.value = []
    } finally {
      if (giphyRequestId.value === reqId) giphyLoading.value = false
    }
  }

  function selectGiphyGif(gif: GiphySearchResponse['items'][number]) {
    if (!opts.canAddMoreMedia.value) return
    const url = (gif?.url ?? '').trim()
    if (!url) return
    opts.composerMedia.value.push({
      localId: makeLocalId(),
      source: 'giphy',
      kind: 'gif',
      previewUrl: url,
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

