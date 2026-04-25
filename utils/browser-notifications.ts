import type { NotificationKind } from '~/types/api'

type CloseBrowserNotificationsMessage = {
  type: 'MOH_CLOSE_NOTIFICATIONS'
  all?: boolean
  kinds?: string[]
  tags?: string[]
  paths?: string[]
  notificationIds?: string[]
}

type NotificationSubjectParams = {
  post_id?: string | null
  user_id?: string | null
  article_id?: string | null
  crew_id?: string | null
  group_id?: string | null
}

const subjectUserKinds: NotificationKind[] = [
  'follow',
  'followed_post',
  'followed_article',
  'mention',
  'comment',
  'boost',
  'repost',
  'coin_transfer',
  'poll_results_ready',
  'generic',
  'message',
]

const postKinds: NotificationKind[] = [
  'comment',
  'boost',
  'repost',
  'followed_post',
  'mention',
  'poll_results_ready',
]

function compactUnique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value ?? '').trim()).filter(Boolean))]
}

function normalizePath(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed, globalThis.location?.origin ?? 'https://menofhunger.com').pathname
  } catch {
    return trimmed.startsWith('/') ? trimmed : null
  }
}

export function closeBrowserNotifications(message: Omit<CloseBrowserNotificationsMessage, 'type'>): void {
  if (!import.meta.client || !('serviceWorker' in navigator)) return

  const payload: CloseBrowserNotificationsMessage = {
    type: 'MOH_CLOSE_NOTIFICATIONS',
    all: message.all === true,
    kinds: compactUnique(message.kinds ?? []),
    tags: compactUnique(message.tags ?? []),
    paths: compactUnique((message.paths ?? []).map((path) => normalizePath(path))),
    notificationIds: compactUnique(message.notificationIds ?? []),
  }

  if (!payload.all && !payload.kinds?.length && !payload.tags?.length && !payload.paths?.length && !payload.notificationIds?.length) return

  void navigator.serviceWorker.ready
    .then((registration) => {
      const worker = navigator.serviceWorker.controller
        ?? registration.active
        ?? registration.waiting
        ?? registration.installing
      worker?.postMessage(payload)
    })
    .catch(() => {})
}

export function closeAllBrowserNotifications(): void {
  closeBrowserNotifications({ all: true })
}

export function closeBrowserNotificationsForHref(href: string | null | undefined): void {
  const path = href ? normalizePath(href) : null
  if (!path) return
  closeBrowserNotifications({ paths: [path] })
}

export function closeBrowserNotificationsForIds(ids: string[]): void {
  closeBrowserNotifications({ notificationIds: ids })
}

export function closeBrowserNotificationsForSubject(params: NotificationSubjectParams): void {
  const postId = params.post_id?.trim()
  const userId = params.user_id?.trim()
  const articleId = params.article_id?.trim()
  const crewId = params.crew_id?.trim()
  const groupId = params.group_id?.trim()

  const paths: string[] = []
  const tags: string[] = []

  if (postId) {
    paths.push(`/p/${encodeURIComponent(postId)}`)
    tags.push(...postKinds.map((kind) => `notif-${kind}-post-${postId}`))
  }

  if (articleId) {
    paths.push(`/a/${encodeURIComponent(articleId)}`)
  }

  if (userId) {
    tags.push(...subjectUserKinds.map((kind) => `notif-${kind}-user-${userId}`))
    // Historical followed_post pushes were tagged by actor when subjectUserId was absent.
    tags.push(`notif-followed_post-actor-${userId}`)
  }

  if (crewId) {
    paths.push(`/c/${encodeURIComponent(crewId)}`, '/crew')
  }

  if (groupId) {
    paths.push(`/g/${encodeURIComponent(groupId)}`)
  }

  closeBrowserNotifications({ paths, tags })
}
