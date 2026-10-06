import type { Ref } from 'vue'
import type { Article, BoardThread } from '~/types/api'
import type { RailContext } from '~/composables/useRailContext'
import { getApiErrorMessage } from '~/utils/api-error'

export type RailRecommendationItem = {
  id: string
  href: string
  title: string
  meta: string
  thumbnailUrl: string | null
  authorId: string | null
}

export type RailRecommendationSection = {
  key: string
  label: string
  items: RailRecommendationItem[]
}

export const RAIL_RELATED_ARTICLE_CANDIDATES = 4
export const RAIL_RELATED_ARTICLE_LIMIT = 3
export const RAIL_AUTHOR_ARTICLE_CANDIDATES = 6
export const RAIL_AUTHOR_ARTICLE_LIMIT = 2
export const RAIL_BOARD_CANDIDATES = 5
export const RAIL_BOARD_LIMIT = 4

type ArticleRailContext = Extract<RailContext, { kind: 'article' }>
type BoardRailContext = Extract<RailContext, { kind: 'board' }>

function articleItem(article: Article, meta: string): RailRecommendationItem {
  return {
    id: article.id,
    href: `/a/${encodeURIComponent(article.id)}`,
    title: article.title,
    meta,
    thumbnailUrl: article.thumbnailUrl ?? null,
    authorId: article.author?.id ?? null,
  }
}

function authorLabel(article: Article): string {
  return article.author?.name?.trim() || article.author?.username?.trim() || ''
}

function readingTimeLabel(article: Article): string {
  return article.readingTimeMinutes ? `${article.readingTimeMinutes} min read` : authorLabel(article)
}

function boardMeta(thread: BoardThread): string {
  const n = thread.commentCount ?? 0
  const comments = `${n} ${n === 1 ? 'comment' : 'comments'}`
  const who = thread.author?.name?.trim() || thread.author?.username?.trim()
  return who ? `${comments} · ${who}` : comments
}

function boardItem(thread: BoardThread): RailRecommendationItem {
  return {
    id: thread.id,
    href: boardThreadHref(thread),
    title: thread.title,
    meta: boardMeta(thread),
    thumbnailUrl: thread.image?.thumbnailUrl ?? thread.image?.url ?? null,
    authorId: thread.author?.id ?? null,
  }
}

/** Article candidates the viewer can read, minus the current article and anything already chosen. */
export function pickArticles(
  candidates: Article[],
  exclude: Set<string>,
  limit: number,
): Article[] {
  const out: Article[] = []
  for (const article of candidates) {
    if (out.length >= limit) break
    if (exclude.has(article.id)) continue
    if (article.viewerCanAccess === false || article.deletedAt || article.isDraft) continue
    out.push(article)
    exclude.add(article.id)
  }
  return out
}

export function pickThreads(candidates: BoardThread[], currentId: string, limit: number): BoardThread[] {
  const out: BoardThread[] = []
  const seen = new Set<string>([currentId])
  for (const thread of candidates) {
    if (out.length >= limit) break
    if (seen.has(thread.id) || thread.viewerHidden) continue
    seen.add(thread.id)
    out.push(thread)
  }
  return out
}

/**
 * Related articles / Board discussions for the right rail. Requests are scoped to the content
 * identity and viewer; a response that arrives after either changed is ignored.
 */
export function useRailRecommendations(context: Ref<RailContext | null>) {
  const { apiFetch } = useApiClient()
  const boardApi = useBoardApi()
  const { user } = useAuth()
  const { blockedIds } = useBlockState()

  const rawSections = ref<RailRecommendationSection[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let token = 0

  const scopeKey = computed(() => {
    const ctx = context.value
    if (!ctx || ctx.kind === 'post') return null
    const tail = ctx.kind === 'article'
      ? `${ctx.tag ?? ''}:${ctx.authorUsername ?? ''}`
      : ctx.tags.join(',')
    return `${ctx.kind}:${ctx.id}:${tail}:${user.value?.id ?? 'anon'}`
  })

  async function loadArticles(ctx: ArticleRailContext): Promise<RailRecommendationSection[]> {
    const fetchList = async (query: Record<string, string | number>) => {
      const res = await apiFetch<Article[]>('/articles', { query })
      return res.data ?? []
    }
    const [related, byAuthor] = await Promise.allSettled([
      ctx.tag
        ? fetchList({ tag: ctx.tag, sort: 'new', limit: RAIL_RELATED_ARTICLE_CANDIDATES })
        : Promise.resolve([] as Article[]),
      ctx.authorUsername
        ? fetchList({ authorUsername: ctx.authorUsername, sort: 'new', limit: RAIL_AUTHOR_ARTICLE_CANDIDATES })
        : Promise.resolve([] as Article[]),
    ])
    if (related.status === 'rejected' && byAuthor.status === 'rejected') throw related.reason

    const taken = new Set<string>([ctx.id])
    const relatedItems = pickArticles(
      related.status === 'fulfilled' ? related.value : [],
      taken,
      RAIL_RELATED_ARTICLE_LIMIT,
    ).map((a) => articleItem(a, authorLabel(a)))
    const authorItems = pickArticles(
      byAuthor.status === 'fulfilled' ? byAuthor.value : [],
      taken,
      RAIL_AUTHOR_ARTICLE_LIMIT,
    ).map((a) => articleItem(a, readingTimeLabel(a)))

    const sections: RailRecommendationSection[] = []
    if (relatedItems.length) sections.push({ key: 'related', label: 'Related articles', items: relatedItems })
    if (authorItems.length) {
      sections.push({
        key: 'author',
        label: ctx.authorName ? `More from ${ctx.authorName}` : 'More from this author',
        items: authorItems,
      })
    }
    return sections
  }

  async function loadBoard(ctx: BoardRailContext): Promise<RailRecommendationSection[]> {
    if (ctx.tags.length) {
      const { threads } = await boardApi.listThreads({
        tags: ctx.tags,
        sort: 'top',
        range: 'week',
        limit: RAIL_BOARD_CANDIDATES,
      })
      const related = pickThreads(threads, ctx.id, RAIL_BOARD_LIMIT)
      if (related.length) {
        return [{ key: 'related', label: 'Related discussions', items: related.map(boardItem) }]
      }
    }
    const { threads } = await boardApi.listThreads({ sort: 'top', range: 'week', limit: RAIL_BOARD_CANDIDATES })
    const popular = pickThreads(threads, ctx.id, RAIL_BOARD_LIMIT)
    return popular.length
      ? [{ key: 'popular', label: 'Popular this week', items: popular.map(boardItem) }]
      : []
  }

  async function load() {
    const ctx = context.value
    const key = scopeKey.value
    if (!ctx || !key || ctx.kind === 'post') return
    const mine = ++token
    loading.value = true
    error.value = null
    try {
      const sections = ctx.kind === 'article' ? await loadArticles(ctx) : await loadBoard(ctx)
      if (mine !== token) return
      rawSections.value = sections
      loaded.value = true
    } catch (e) {
      if (mine !== token) return
      rawSections.value = []
      error.value = getApiErrorMessage(e) || 'Failed to load recommendations.'
      loaded.value = true
    } finally {
      if (mine === token) loading.value = false
    }
  }

  watch(
    scopeKey,
    (key) => {
      token += 1
      rawSections.value = []
      loaded.value = false
      loading.value = false
      error.value = null
      if (key && import.meta.client) void load()
    },
    { immediate: true },
  )

  const sections = computed<RailRecommendationSection[]>(() => {
    const blocked = blockedIds.value
    return rawSections.value
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.authorId || !blocked.has(item.authorId)),
      }))
      .filter((section) => section.items.length > 0)
  })

  function removeItem(id: string) {
    rawSections.value = rawSections.value
      .map((section) => ({ ...section, items: section.items.filter((item) => item.id !== id) }))
      .filter((section) => section.items.length > 0)
  }

  function patchItem(id: string, patch: Partial<Pick<RailRecommendationItem, 'title' | 'meta'>>) {
    rawSections.value = rawSections.value.map((section) => ({
      ...section,
      items: section.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const itemIds = computed(() => rawSections.value.flatMap((section) => section.items.map((item) => item.id)))

  return { sections, loading, loaded, error, itemIds, retry: load, removeItem, patchItem }
}
