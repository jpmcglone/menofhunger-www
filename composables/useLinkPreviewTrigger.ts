import { isRecentTouch } from '~/utils/recent-touch'
import { extractMohUsername } from '~/utils/link-utils'

type PreviewKind = 'user' | 'link'

/** Hover trigger for space live-chat URLs. Known MoH entities reuse their rich cards. */
export function useLinkPreviewTrigger() {
  const linkPop = useLinkPreviewPopover()
  const userPop = useUserPreviewPopover()
  const userTrigger = useUserPreviewMultiTrigger()

  let kind: PreviewKind | null = null

  function onEnter(url: string | undefined | null, e: MouseEvent) {
    const href = (url ?? '').trim()
    if (!href || isRecentTouch()) return

    const username = extractMohUsername(href)
    if (username) {
      kind = 'user'
      linkPop.close()
      userTrigger.onEnter(username, e)
      return
    }

    kind = 'link'
    userPop.close()
    linkPop.onTriggerEnter({ url: href, event: e })
  }

  function onMove(e: MouseEvent) {
    if (isRecentTouch()) return
    if (kind === 'user') userTrigger.onMove(e)
    else if (kind === 'link') linkPop.onTriggerMove(e)
  }

  function onLeave() {
    if (kind === 'user') userTrigger.onLeave()
    else if (kind === 'link') linkPop.onTriggerLeave()
  }

  return { onEnter, onMove, onLeave }
}
