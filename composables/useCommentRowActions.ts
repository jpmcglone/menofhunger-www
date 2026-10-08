import type { MenuItem } from 'primevue/menuitem'
import { useAppConfirm, type ConfirmOptions } from '~/composables/useAppConfirm'
import { useAppToast, type AppToastTone } from '~/composables/useAppToast'
import { useAsyncAction } from '~/composables/useAsyncAction'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

export type CommentRowToast = { title: string; message?: string; tone?: AppToastTone; durationMs?: number }

export type CommentRowMenuItem = MenuItem & { iconName?: string }

export type UseCommentRowActionsOptions = {
  /** Absolute URL to copy for "Copy link" (evaluated on click, client only). */
  linkUrl: () => string
  copySuccess?: CommentRowToast
  /** Receives the URL so callers can show it when the clipboard is unavailable. */
  copyFailure?: (url: string) => CommentRowToast
  /** Confirmation dialog shown before deleting; omit when the caller confirms elsewhere. */
  deleteConfirm?: () => ConfirmOptions
  /** Performs the delete; throw to surface the error toast. */
  performDelete?: () => Promise<void>
  deleteError?: string
  deleteErrorDurationMs?: number
}

/** Shared copy-link / delete-with-confirm / menu-item behavior for comment rows (article and board). */
export function useCommentRowActions(options: UseCommentRowActionsOptions) {
  const toast = useAppToast()
  const { confirm } = useAppConfirm()
  const { copyText } = useCopyToClipboard()
  const { run } = useAsyncAction()

  async function copyLink() {
    const url = options.linkUrl()
    try {
      await copyText(url)
      toast.push(options.copySuccess ?? { title: 'Link copied', tone: 'success', durationMs: 1400 })
    } catch {
      toast.push(options.copyFailure?.(url) ?? { title: 'Copy failed', tone: 'error', durationMs: 1800 })
    }
  }

  async function deleteComment() {
    if (!options.performDelete) return
    if (options.deleteConfirm) {
      const ok = await confirm(options.deleteConfirm())
      if (!ok) return
    }
    await run(options.performDelete, {
      error: options.deleteError ?? 'Couldn’t delete the comment.',
      durationMs: options.deleteErrorDurationMs ?? 2200,
    })
  }

  function buildMenuItems(parts: { onReport?: (() => void) | null; canDelete?: boolean }): CommentRowMenuItem[] {
    const items: CommentRowMenuItem[] = [{ label: 'Copy link', iconName: 'tabler:link', command: () => void copyLink() }]
    if (parts.onReport) items.push({ label: 'Report comment', iconName: 'tabler:flag', command: parts.onReport })
    if (parts.canDelete) {
      items.push({
        label: 'Delete comment',
        iconName: 'tabler:trash',
        class: 'text-red-600 dark:text-red-400',
        command: () => void deleteComment(),
      })
    }
    return items
  }

  return { copyLink, deleteComment, buildMenuItems }
}
