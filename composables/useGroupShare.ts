import type { CommunityGroupShell } from '~/types/api'
import { groupShareText, groupShareUrl } from '~/utils/acquisition-share'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { useAsyncAction } from '~/composables/useAsyncAction'

/** Share and copy-invite-link actions for a group, with the viewer's referral code attached. */
export function useGroupShare(shell: () => Pick<CommunityGroupShell, 'slug' | 'name'> | null | undefined) {
  const { copyText } = useCopyToClipboard()
  const { share: nativeShare, isSupported: nativeShareSupported } = useWebShare()
  const toast = useAppToast()
  const { run } = useAsyncAction()
  const { user } = useAuth()
  const { referralCode, ensureReferralCode } = useEnsureReferralCode()

  async function resolveGroupShare() {
    await ensureReferralCode()
    const origin = import.meta.client ? window.location.origin : 'https://menofhunger.com'
    const url = groupShareUrl(
      shell()?.slug ?? '',
      {
        ref: referralCode.value ?? null,
        from: user.value?.username ?? null,
      },
      origin,
    )
    const message = groupShareText(shell()?.name ?? 'this group')
    return { url, message }
  }

  async function shareGroup() {
    await run(async () => {
      const { url, message } = await resolveGroupShare()
      if (nativeShareSupported.value) {
        const shared = await nativeShare({ title: 'Men of Hunger', text: message, url })
        if (shared) {
          toast.push({ title: 'Shared', tone: 'public', durationMs: 1200 })
          return
        }
      }
      await copyText(`${message}\n${url}`)
      toast.push({ title: 'Invite link copied', tone: 'public', durationMs: 1400 })
    }, { error: () => 'Share failed', durationMs: 1800 })
  }

  async function copyGroupLink() {
    await run(async () => {
      const { url, message } = await resolveGroupShare()
      await copyText(`${message}\n${url}`)
      toast.push({ title: 'Invite link copied', tone: 'public', durationMs: 1400 })
    }, { error: () => 'Copy failed', durationMs: 1800 })
  }

  return { nativeShareSupported, shareGroup, copyGroupLink }
}
