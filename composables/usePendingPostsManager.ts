import type { FeedPost } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

/**
 * Centralized manager for optimistic post submissions.
 *
 * The composer enqueues a pending post here. The manager:
 *  - Notifies the consumer (a feed) so it can render the optimistic row.
 *  - Runs the actual API call in the background.
 *  - On success, asks the consumer to swap the optimistic row for the real post.
 *  - On failure, marks the optimistic row failed in the consumer feed AND shows
 *    a persistent toast with Retry / Discard buttons. The toast is also wired
 *    so dismissing it does not silently drop the row — the row stays visible
 *    with its own retry/discard affordance.
 *
 * The manager itself is route-agnostic: each enqueue passes feed-specific
 * callbacks (insert / replace / mark failed / remove). Module-scoped state
 * keeps in-flight callbacks alive across composer/feed re-mounts.
 */

export type PendingFeedCallbacks = {
  /** Insert the optimistic post into the feed. Called once on enqueue. */
  insert: (optimisticPost: FeedPost) => void
  /** Replace the optimistic row with the real, server-acknowledged post. */
  replace: (localId: string, realPost: FeedPost) => void
  /** Set the optimistic row's _pending = 'failed' + error message. */
  markFailed: (localId: string, errorMessage: string) => void
  /** Remove the optimistic row from the feed (on user discard). */
  remove: (localId: string) => void
  /** Reset the optimistic row's status back to 'posting' (on retry). */
  markPosting: (localId: string) => void
}

export type PendingPostInput = {
  localId: string
  optimisticPost: FeedPost
  /** The actual API call. Returns the server-acknowledged post (or { id }). */
  perform: () => Promise<FeedPost | { id: string } | null | undefined>
  /** Feed callbacks. */
  callbacks: PendingFeedCallbacks
  /**
   * Optional. Called after the real post lands. Useful for the original page
   * to fire follow-up effects (e.g. autoplay video, streak rewards).
   */
  onSuccess?: (realPost: FeedPost) => void
}

type Entry = PendingPostInput & {
  status: 'posting' | 'failed'
  errorMessage: string | null
  failedToastId: string | null
}

// Module-scoped registry keyed by localId. Survives component lifecycles so
// in-flight retries are not dropped if the originating composer unmounts.
const REGISTRY = new Map<string, Entry>()

function isFeedPost(value: unknown): value is FeedPost {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<FeedPost>
  // `media` may legitimately be null/undefined for text-only posts returned by some API paths;
  // don't require it to be an array or text-only replies would be silently dropped.
  return typeof v.id === 'string' && typeof v.body === 'string'
}

/**
 * Defensive unwrap. The post-create endpoint returns `{ post, streakReward }`
 * (CreatePostData), but other code paths may pass a bare FeedPost. Accept both
 * so a caller forgetting to unwrap doesn't silently drop the optimistic row.
 */
function extractFeedPost(value: unknown): FeedPost | null {
  if (isFeedPost(value)) return value
  if (value && typeof value === 'object' && 'post' in value) {
    const inner = (value as { post: unknown }).post
    if (isFeedPost(inner)) return inner
  }
  return null
}

export function usePendingPostsManager() {
  const toast = useAppToast()

  function showFailureToast(entry: Entry) {
    const id = toast.push({
      title: 'Couldn’t post',
      message: entry.errorMessage || 'Something went wrong.',
      tone: 'error',
      actions: [
        {
          id: 'retry',
          label: 'Retry',
          primary: true,
          onClick: () => {
            void retry(entry.localId)
          },
        },
      ],
    })
    entry.failedToastId = id
  }

  async function runPerform(entry: Entry) {
    try {
      const res = await entry.perform()
      const real = extractFeedPost(res)
      if (!real) {
        // Some create paths return `null` to signal a no-op (e.g. empty body).
        // Treat that as a success-ish removal — drop the optimistic row.
        entry.callbacks.remove(entry.localId)
        REGISTRY.delete(entry.localId)
        return
      }
      entry.callbacks.replace(entry.localId, real)
      entry.onSuccess?.(real)
      REGISTRY.delete(entry.localId)
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e) || 'Failed to post.'
      entry.status = 'failed'
      entry.errorMessage = msg
      entry.callbacks.markFailed(entry.localId, msg)
      showFailureToast(entry)
    }
  }

  function submit(input: PendingPostInput): void {
    const existing = REGISTRY.get(input.localId)
    if (existing) {
      // Defensive: do not double-enqueue; treat as retry.
      void retry(input.localId)
      return
    }
    const entry: Entry = {
      ...input,
      status: 'posting',
      errorMessage: null,
      failedToastId: null,
    }
    REGISTRY.set(input.localId, entry)
    entry.callbacks.insert(entry.optimisticPost)
    void runPerform(entry)
  }

  async function retry(localId: string): Promise<void> {
    const entry = REGISTRY.get(localId)
    if (!entry) return
    if (entry.failedToastId) {
      toast.dismiss(entry.failedToastId)
      entry.failedToastId = null
    }
    entry.status = 'posting'
    entry.errorMessage = null
    entry.callbacks.markPosting(localId)
    await runPerform(entry)
  }

  function discard(localId: string): void {
    const entry = REGISTRY.get(localId)
    if (!entry) return
    if (entry.failedToastId) {
      toast.dismiss(entry.failedToastId)
      entry.failedToastId = null
    }
    entry.callbacks.remove(localId)
    REGISTRY.delete(localId)
  }

  function get(localId: string): { status: 'posting' | 'failed'; errorMessage: string | null } | null {
    const e = REGISTRY.get(localId)
    if (!e) return null
    return { status: e.status, errorMessage: e.errorMessage }
  }

  return { submit, retry, discard, get }
}

export function makePendingLocalId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `local_${Date.now().toString(36)}_${rand}`
}

export function isPendingLocalId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('local_')
}
