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
          class="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          role="presentation"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition-[opacity,transform] duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
          >
            <section
              v-if="open"
              class="relative w-full max-w-md rounded-t-3xl bg-white text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:rounded-3xl dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15"
              :style="{ paddingBottom: `calc(var(--moh-safe-bottom, 0px) + 1.5rem)` }"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              @click.stop
            >
              <!-- Header. For a check-in the streak IS the headline (the emotional payoff);
                   otherwise it's a plain "Share this post". The prompt is intentionally not
                   repeated here — it already shows inside the post preview below. -->
              <header class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div class="flex min-w-0 items-start gap-3">
                  <span
                    v-if="showStreakHero"
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl leading-none"
                    style="background-color: var(--moh-checkin-soft)"
                    aria-hidden="true"
                  >🔥</span>
                  <div class="min-w-0">
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
                  class="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  aria-label="Close"
                  @click="close"
                >
                  <Icon name="tabler:x" aria-hidden="true" />
                </button>
              </header>

              <!-- Post preview — tapping navigates to the post and closes the dialog -->
              <div class="px-5" @click="close">
                <AppEmbeddedPostPreview :preloaded-post="post" />
              </div>

              <!-- Actions -->
              <div class="mt-4 flex flex-col gap-2.5 px-5">
                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2 rounded-2xl py-3 px-4 text-sm font-semibold transition-opacity active:opacity-75"
                  :class="shareButtonClass"
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
                  class="flex w-full items-center justify-center gap-2 rounded-2xl border moh-border py-3 px-4 text-sm font-semibold moh-text transition-opacity active:opacity-75 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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
                class="mt-3 flex items-center justify-center gap-1.5 px-5 text-[13px] font-medium moh-text-muted transition-colors hover:moh-text"
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

const isCheckin = computed(() => props.post.kind === 'checkin')
const streakDays = computed(() => (isCheckin.value ? (user.value?.checkinStreakDays ?? 0) : 0))

const checkinDayKey = computed(() => (isCheckin.value ? (props.post.checkinDayKey ?? null) : null))

// Social proof for check-in posts — read from the shared cache populated by useDailyCheckin.
const { state: checkinState, refresh: refreshCheckin } = useDailyCheckin()
const socialProofTotal = computed(() => checkinState.value?.socialProof?.totalToday ?? 0)

// Header: the streak is the hero for a check-in; everything else is a plain share.
const showStreakHero = computed(() => isCheckin.value && streakDays.value > 0)
const headerTitle = computed(() =>
  showStreakHero.value ? `${streakDays.value}-day streak` : 'Share this post',
)
const headerSubtitle = computed(() => {
  if (!showStreakHero.value) return 'Let others see what you wrote.'
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

const shareUrl = computed(
  () => `${siteConfig.url}/p/${encodeURIComponent(props.post.id)}`,
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

async function onShare() {
  if (sharing.value) return
  sharing.value = true
  try {
    const shared = await nativeShare({
      title: 'Men of Hunger',
      text: props.post.body?.slice(0, 120) || 'Check out this post on Men of Hunger',
      url: shareUrl.value,
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
    await copyText(shareUrl.value)
    toast.push({ title: 'Link copied', tone: 'success', durationMs: 1600 })
    close()
  } catch {
    toast.push({ title: 'Could not copy link', tone: 'error', durationMs: 1800 })
  } finally {
    copying.value = false
  }
}

// Track whether we have a history entry pushed for this dialog.
// Not reactive — used only as an internal guard.
let hasPushedState = false
// Set to true before emitting open from popstate to prevent double-pushing.
let skipNextHistoryPush = false

const route = useRoute()

function close() {
  if (hasPushedState) {
    hasPushedState = false
    history.back()
    // history.back() is async; popstate will fire after the URL changes but we
    // also emit synchronously so the parent can start closing the dialog immediately.
  }
  emit('update:open', false)
}

function onPopState(event: PopStateEvent) {
  if (!import.meta.client) return
  if (event.state?._mohShareDialog && !props.open && hasPushedState) {
    // User pressed forward (or back) and landed on our pushed entry → reopen.
    skipNextHistoryPush = true
    emit('update:open', true)
  } else if (!event.state?._mohShareDialog && hasPushedState && props.open) {
    // User pressed back past our entry → close.
    hasPushedState = false
    emit('update:open', false)
  }
}

useModalEscape(toRef(props, 'open'), close)

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    const root = document.documentElement
    if (open) {
      root.style.overflow = 'hidden'
      if (!skipNextHistoryPush) {
        history.pushState({ _mohShareDialog: true }, '')
        hasPushedState = true
      }
      skipNextHistoryPush = false
      // Prime the social-proof count from cache (near-free TTL hit right after posting).
      if (isCheckin.value) void refreshCheckin()
    } else {
      root.style.overflow = ''
    }
  },
)

// When the route changes (e.g. user taps "See how others answered"), close the dialog
// WITHOUT popping the history entry so pressing back can restore it.
watch(
  () => route.fullPath,
  (newPath, oldPath) => {
    if (!import.meta.client) return
    if (props.open && newPath !== oldPath) {
      emit('update:open', false)
    }
  },
)

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('popstate', onPopState)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('popstate', onPopState)
  document.documentElement.style.overflow = ''
  // Clean up the pushed history entry if the component is destroyed while open.
  if (hasPushedState) {
    hasPushedState = false
    history.back()
  }
})
</script>
