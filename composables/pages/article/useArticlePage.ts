import { formatLocaleDate } from '~/utils/time-format'
import type { Article } from '~/types/api'
import { useArticlePageActions } from './useArticlePageActions'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/a/:id`, shared with the article page sections through
 * `useArticlePageContext()`.
 */
export function useArticlePage() {
  const content = useArticlePageContent()
  const actions = useArticlePageActions(content)
  const ctx = { ...content, ...actions }
  provide(ARTICLE_PAGE_CONTEXT, ctx)
  return ctx
}

/**
 * Route, auth, the article fetch, rendered Tiptap body, and author/byline labels.
 */
export function useArticlePageContent() {
  const route = useRoute()
  const id = computed(() => route.params.id as string)
  const { apiFetchData } = useApiClient()
  const { isAuthed, user } = useAuth()
  const { markReadBySubject } = useNotifications()
  const { show: showAuthActionModal } = useAuthActionModal()
  const { openFromEvent: openLightbox } = useImageLightbox()

  const gateKind = computed(() =>
    article.value?.visibility === 'premiumOnly' ? 'premium' : 'verify',
  )

  function onThumbnailClick(e: MouseEvent) {
    const url = article.value?.thumbnailUrl
    if (!url || article.value?.viewerCanAccess === false) return
    void openLightbox(e, url, article.value?.title ?? '', 'media')
  }

  function onArticleBodyClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return
    const img = target as HTMLImageElement
    const src = img.currentSrc || img.src || img.getAttribute('src') || ''
    if (!src) return
    // Pass the img element as currentTarget so the animation zooms from the image position.
    void openLightbox({ currentTarget: img } as unknown as MouseEvent, src, img.alt || '', 'media')
  }

  const { data: article, pending, error: articleError, refresh: refreshArticle } = useAsyncData<Article>(
    `article-${id.value}`,
    () => apiFetchData<Article>(`/articles/${id.value}`),
  )

  // Distinguish "not found" (404) from real load failures (network/5xx) so we don't
  // tell the user an article doesn't exist when the server/network is actually the problem.
  const articleErrorStatus = computed(() => {
    const err = articleError.value as { statusCode?: number; status?: number; response?: { status?: number } } | null
    return Number(err?.statusCode ?? err?.status ?? err?.response?.status ?? 0) || null
  })
  const articleIsNotFound = computed(() => !articleError.value || articleErrorStatus.value === 404)

  // SEO / OG
  useArticleSeo(article)

  useRailContextPublisher(() => {
    const a = article.value
    if (!a || a.deletedAt || a.isDraft) return null
    return {
      kind: 'article',
      id: a.id,
      tag: a.tags?.[0]?.tag ?? null,
      authorUsername: a.author?.username ?? null,
      authorName: a.author?.name?.trim() || a.author?.username || null,
    }
  })

  // Lazily load Tiptap rendering deps to keep them out of the main page chunk.
  // The shared factory in ~/utils/tiptap-render-extensions is also used by
  // the server-side RSS feed builder (server/utils/article-feed.ts).
  let _generateHTML: typeof import('@tiptap/html')['generateHTML'] | null = null
  let _extensions: any[] | null = null

  async function getTiptapRenderer() {
    if (_generateHTML && _extensions) return { generateHTML: _generateHTML, extensions: _extensions }
    const [{ generateHTML }, { buildTiptapExtensions }] = await Promise.all([
      import('@tiptap/html'),
      import('~/utils/tiptap-render-extensions'),
    ])
    _extensions = buildTiptapExtensions()
    _generateHTML = generateHTML
    return { generateHTML: _generateHTML, extensions: _extensions }
  }

  // Rendered HTML from Tiptap JSON (async to support lazy imports)
  const renderedBody = ref('')

  watchEffect(async () => {
    const bodyJson = article.value?.body
    if (!bodyJson || bodyJson === '{}') { renderedBody.value = ''; return }
    try {
      const { generateHTML, extensions } = await getTiptapRenderer()
      renderedBody.value = generateHTML(JSON.parse(bodyJson), extensions)
    } catch {
      renderedBody.value = article.value?.body ?? ''
    }
  })

  // Client-side version with proper DOM parsing
  const bodyWithHeadingIds = computed(() => {
    const html = renderedBody.value
    if (!html || !import.meta.client) return html
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const seen = new Map<string, number>()
      doc.querySelectorAll('h2, h3').forEach((el) => {
        const text = el.textContent?.trim() ?? ''
        const baseId = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '') || 'heading'
        const count = seen.get(baseId) ?? 0
        el.id = count === 0 ? baseId : `${baseId}-${count}`
        seen.set(baseId, count + 1)
      })
      return doc.body.innerHTML
    } catch {
      return html
    }
  })

  // Reading time (estimate from word count in body)
  const readingTime = computed(() => {
    if (!article.value?.body) return null
    try {
      const json = JSON.parse(article.value.body)
      const texts: string[] = []
      function walk(node: any) {
        if (!node) return
        if (node.type === 'text' && node.text) texts.push(node.text)
        if (Array.isArray(node.content)) node.content.forEach(walk)
      }
      walk(json)
      const words = texts.join(' ').split(/\s+/).filter(Boolean).length
      const minutes = Math.max(1, Math.round(words / 200))
      return `${minutes} min read`
    } catch {
      return null
    }
  })

  // Published date label
  const publishedLabel = computed(() => {
    const dateStr = article.value?.publishedAt ?? article.value?.createdAt
    if (!dateStr) return ''
    return formatLocaleDate(new Date(dateStr), { month: 'long', day: 'numeric', year: 'numeric' })
  })

  const editedLabel = computed(() => {
    const dateStr = article.value?.editedAt
    if (!dateStr) return ''
    return formatLocaleDate(new Date(dateStr), { month: 'short', day: 'numeric', year: 'numeric' })
  })

  // Author bio (use articleBio override if set, otherwise regular bio)
  const authorBio = computed(() => article.value?.author?.articleBio || article.value?.author?.bio || null)

  // Is the current viewer the author
  const viewerIsAuthor = computed(() => Boolean(user.value?.id && article.value?.author?.id === user.value.id))

  return {
    route,
    id,
    apiFetchData,
    isAuthed,
    user,
    markReadBySubject,
    showAuthActionModal,
    gateKind,
    onThumbnailClick,
    onArticleBodyClick,
    article,
    pending,
    articleError,
    refreshArticle,
    articleIsNotFound,
    renderedBody,
    bodyWithHeadingIds,
    readingTime,
    publishedLabel,
    editedLabel,
    authorBio,
    viewerIsAuthor,
  }
}

export type ArticlePageContext = ReturnType<typeof useArticlePage>

export const ARTICLE_PAGE_CONTEXT: InjectionKey<ArticlePageContext> = Symbol('article-page')

/** Section components of pages/a/[id].vue read the shared context here. */
export function useArticlePageContext(): ArticlePageContext {
  const ctx = inject(ARTICLE_PAGE_CONTEXT)
  if (!ctx) throw new Error('useArticlePageContext() must be used inside pages/a/[id].vue')
  return ctx
}
