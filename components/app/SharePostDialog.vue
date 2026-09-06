<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed"
          :class="isCheckin
            ? 'pointer-events-none inset-x-0 bottom-[calc(var(--moh-tabbar-height,4rem)+var(--moh-safe-bottom,0px))] z-[80] px-3 pb-3 md:bottom-0 md:px-4 md:pb-4'
            : 'inset-0 z-[9999] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6'"
          role="presentation"
          @click.self="!isCheckin && close()"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
          >
            <section
              v-if="open"
              class="relative w-full text-left"
              :class="isCheckin
                ? 'pointer-events-auto mx-auto grid max-w-6xl gap-x-5 rounded-xl border moh-border bg-[var(--moh-surface-2)] p-4 shadow-lg sm:grid-cols-[minmax(0,1fr)_auto] xl:max-w-7xl'
                : 'max-w-md rounded-t-3xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:rounded-3xl dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15'"
              :style="isCheckin ? undefined : { paddingBottom: `calc(var(--moh-safe-bottom, 0px) + 1.5rem)` }"
              :role="isCheckin ? 'region' : 'dialog'"
              :aria-modal="isCheckin ? undefined : true"
              :aria-labelledby="titleId"
              @click.stop
              @keydown.esc.stop="close"
            >
              <!-- A check-in needs a compact acknowledgement; ordinary sharing keeps its preview. -->
              <header class="flex items-start justify-between gap-3" :class="isCheckin ? 'min-w-0 pr-9' : 'px-5 pt-5 pb-3'">
                <div class="flex min-w-0 items-start gap-3">
                  <span
                    v-if="showStreakHero"
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl leading-none"
                    style="background-color: var(--moh-checkin-soft)"
                    aria-hidden="true"
                  >🔥</span>
                  <div class="min-w-0" :role="isCheckin ? 'status' : undefined" :aria-live="isCheckin ? 'polite' : undefined">
                    <h2 :id="titleId" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                      {{ headerTitle }}
                    </h2>
                    <p class="mt-0.5 text-xs moh-text-muted text-pretty">
                      {{ headerSubtitle }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  :class="isCheckin ? 'absolute right-1 top-1' : '-mr-1 -mt-1'"
                  aria-label="Close"
                  @click="close"
                >
                  <Icon name="tabler:x" aria-hidden="true" />
                </button>
              </header>

              <!-- Post preview — tapping navigates to the post and closes the dialog -->
              <div v-if="!isCheckin" class="px-5" @click="close">
                <AppEmbeddedPostPreview :preloaded-post="post" />
              </div>

              <!-- Actions -->
              <div class="flex gap-2.5" :class="isCheckin ? 'mt-3 flex-wrap items-center sm:row-span-2 sm:mt-0 sm:pr-9' : 'mt-4 flex-col px-5'">
                <button
                  type="button"
                  class="flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition-opacity active:opacity-75"
                  :class="[shareButtonClass, isCheckin ? 'rounded-lg py-2' : 'w-full rounded-2xl py-3']"
                  :disabled="sharing"
                  @click="onShare"
                >
                  <svg v-if="canNativeShare" viewBox="0 0 24 24" class="h-[1.1em] w-[1.1em] shrink-0" aria-hidden="true">
                    <path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                    <path d="M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <Icon
                    v-else
                    name="tabler:link"
                    class="text-base shrink-0"
                    aria-hidden="true"
                  />
                  {{ canNativeShare ? 'Share' : 'Copy link' }}
                </button>

                <button
                  v-if="canNativeShare"
                  type="button"
                  class="flex min-h-11 items-center justify-center gap-2 border moh-border px-4 text-sm font-semibold moh-text transition-opacity active:opacity-75 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  :class="isCheckin ? 'rounded-lg py-2' : 'w-full rounded-2xl py-3'"
                  :disabled="copying"
                  @click="onCopy"
                >
                  <Icon name="tabler:link" class="text-base shrink-0" aria-hidden="true" />
                  Copy link
                </button>
              </div>

              <!-- Quiet "see how others answered" link (check-ins only). A leave-this-flow action,
                   so it sits below the primary actions instead of competing with them. -->
              <NuxtLink
                v-if="checkinDayKey"
                :to="`/check-ins/day/${checkinDayKey}`"
                class="flex min-h-11 items-center gap-1.5 text-[13px] font-medium moh-text-muted transition-colors hover:moh-text"
                :class="isCheckin ? 'justify-self-start sm:col-start-1' : 'mt-3 justify-center px-5'"
                @click="close"
              >
                <span>{{ seeOthersLabel }}</span>
                <Icon name="tabler:arrow-right" size="14" class="shrink-0" aria-hidden="true" />
              </NuxtLink>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { siteConfig } from '~/config/site'
import { postShareText, postShareUrl } from '~/utils/acquisition-share'

const { user } = useAuth()

const props = defineProps<{
  open: boolean
  post: FeedPost
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const titleId = `moh-share-post-${useId()}`
const toast = useAppToast()
const { share: nativeShare, isSupported: isNativeShareSupported } = useWebShare()
const { copyText } = useCopyToClipboard()
const { referralCode, ensureReferralCode } = useEnsureReferralCode()

const isCheckin = computed(() => props.post.kind === 'checkin')
const streakDays = computed(() => (isCheckin.value ? (user.value?.checkinStreakDays ?? 0) : 0))

const checkinDayKey = computed(() => (isCheckin.value ? (props.post.checkinDayKey ?? null) : null))

// Social proof for check-in posts — read from the shared cache populated by useDailyCheckin.
const { state: checkinState, refresh: refreshCheckin } = useDailyCheckin()
const socialProofTotal = computed(() => checkinState.value?.socialProof?.totalToday ?? 0)

// Header: the streak is the hero for a check-in; everything else is a plain share.
const showStreakHero = computed(() => isCheckin.value && streakDays.value > 0)
const headerTitle = computed(() =>
  showStreakHero.value ? `${streakDays.value}-day streak` : isCheckin.value ? 'Check-in saved' : 'Share this post',
)
const headerSubtitle = computed(() => {
  if (!showStreakHero.value) return isCheckin.value ? 'Thanks for showing up today.' : 'Invite someone into the conversation.'
  if (streakDays.value >= 7) {
    const weeks = Math.floor(streakDays.value / 7)
    return `That's ${weeks === 1 ? 'a full week' : `${weeks} weeks`}. Keep it going.`
  }
  return 'Keep it going tomorrow.'
})

const seeOthersLabel = computed(() => {
  const others = socialProofTotal.value - 1
  if (others >= 1) {
    return `See how ${others} other ${others === 1 ? 'man' : 'men'} answered`
  }
  return 'See how others answered'
})

const shareMessage = computed(() =>
  postShareText({
    isCheckin: isCheckin.value,
    streakDays: streakDays.value,
    commentCount: props.post.commentCount ?? 0,
  }),
)

const canNativeShare = computed(() => isNativeShareSupported.value)

const visibility = computed(() => props.post.visibility)

const shareButtonClass = computed(() => {
  if (props.post.communityGroupId) {
    return 'bg-[color:var(--moh-group)] text-white'
  }
  if (visibility.value === 'premiumOnly') return 'moh-btn-premium moh-btn-tone text-white'
  if (visibility.value === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone text-white'
  if (visibility.value === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone text-white'
  return 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
})

const sharing = ref(false)
const copying = ref(false)

async function resolveShareUrl() {
  await ensureReferralCode()
  return postShareUrl(props.post.id, referralCode.value ?? null, siteConfig.url)
}

async function onShare() {
  if (sharing.value) return
  sharing.value = true
  try {
    const url = await resolveShareUrl()
    const shared = await nativeShare({
      title: 'Men of Hunger',
      text: shareMessage.value,
      url,
    })
    // Only close the modal on a real share — not when the user cancels the share sheet.
    if (shared) close()
  } finally {
    sharing.value = false
  }
}

async function onCopy() {
  if (copying.value) return
  copying.value = true
  try {
    const url = await resolveShareUrl()
    await copyText(url)
    toast.push({ title: 'Link copied', tone: 'success', durationMs: 1600 })
    close()
  } catch {
    toast.push({ title: 'Could not copy link', tone: 'error', durationMs: 1800 })
  } finally {
    copying.value = false
  }
}

const open = toRef(props, 'open')

function close() {
  emit('update:open', false)
}

// Only explicit share modals own scroll/history. The confirmation leaves normal browsing intact.
const modalOpen = computed(() => open.value && !isCheckin.value)
useOverlayDismiss(modalOpen, close)
useScrollLock(modalOpen)
const route = useRoute()
watch(() => route.fullPath, () => { if (open.value && isCheckin.value) close() })

watch(open, (isOpen) => {
  // Prime the social-proof count from cache (near-free TTL hit right after posting).
  if (isOpen && isCheckin.value) void refreshCheckin()
  if (isOpen) void ensureReferralCode()
})
</script>
