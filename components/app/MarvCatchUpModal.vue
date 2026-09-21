<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Catch me up"
          @click.self="hide"
          @keydown.escape="hide"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-3 sm:scale-[0.98]"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            appear
          >
            <!-- Figma Catch up/Flow: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=38-926 -->
            <section
              class="moh-surface flex h-[min(37.5rem,90dvh)] max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-xl sm:rounded-2xl"
            >
              <header class="shrink-0 flex items-center gap-3 border-b moh-border px-4 py-3">
                <h2 class="moh-h3 min-w-0 flex-1 leading-tight">Catch me up</h2>
                <AppMarvModeDropdown
                  v-if="isAvailable"
                  :model-value="preferredMode ?? 'auto'"
                  :costs="me?.costs"
                  :disabled="modeBusy || loading || peeking"
                  aria-label="Summary mode"
                  @update:model-value="onPickMode"
                />
                <button
                  type="button"
                  class="moh-tap inline-flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  aria-label="Close"
                  @click="hide"
                >
                  <Icon name="tabler:x" class="text-[18px]" aria-hidden="true" />
                </button>
              </header>

              <div class="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-4">
                <div v-if="!isAvailable" class="flex min-h-full flex-col">
                  <div v-if="result" class="mb-6">
                    <AppCatchUpMarvMessage
                      :result="result"
                      :staleness-label="stalenessLabel"
                      :summary-meta="summaryMeta"
                      :post-section-label="postSectionLabel"
                      :marv-name="marvName"
                      :marv-user="marvUser"
                    />
                  </div>
                  <div class="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <p class="mb-1 text-[15px] font-medium">Catch up with Premium</p>
                    <p class="max-w-xs text-[13px] moh-text-muted">
                      {{
                        result
                          ? 'A member summarized this thread. Premium lets you catch up on any thread.'
                          : 'Read a member summary if one exists. Generate your own with Premium.'
                      }}
                    </p>
                  </div>
                </div>

                <template v-else>
                  <AppCatchUpMarvMessage
                    v-if="result && !loading"
                    :result="result"
                    :staleness-label="stalenessLabel"
                    :summary-meta="summaryMeta"
                    :post-section-label="postSectionLabel"
                    :cost-breakdown-label="costBreakdownLabel"
                    :marv-name="marvName"
                    :marv-user="marvUser"
                  />
                  <AppCatchUpMarvTyping
                    v-else-if="loading || peeking"
                    :marv-name="marvName"
                    :marv-user="marvUser"
                    :label="loading ? 'Writing…' : 'Checking…'"
                  />
                  <AppCatchUpMarvMessage
                    v-else-if="errorMessage"
                    error
                    :error-text="errorMessage"
                    :marv-name="marvName"
                    :marv-user="marvUser"
                    meta="Couldn't finish"
                  />
                  <div
                    v-else
                    class="flex min-h-full flex-col items-center justify-center py-8 text-center"
                  >
                    <p class="mb-1 text-[15px] font-medium">Marv will brief this thread</p>
                    <p class="max-w-xs text-[13px] moh-text-muted">
                      One message with the gist, useful replies, and what changed.
                    </p>
                  </div>
                  <p v-if="result && errorMessage" class="mt-3 text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
                  <AppMarvParticipation v-if="post && result && !loading" :key="post.id" :post-id="post.id" class="mt-6" @navigate="hide" />
                </template>
              </div>

              <footer class="min-h-[72px] shrink-0 flex flex-wrap items-center gap-3 border-t moh-border px-4 py-3">
                <template v-if="!isAvailable">
                  <span class="mr-auto text-[12px] moh-text-muted" />
                  <AppActionButton
                    as="NuxtLink"
                    to="/tiers"
                    label="Upgrade to Premium"
                    @click="hide"
                  />
                </template>
                <template v-else-if="result">
                  <span class="mr-auto min-w-0 text-[12px] moh-text-muted">
                    {{ result.stale ? (stalenessLabel || 'Thread moved on') : 'Up to date' }}
                    <span v-if="creditsLabel"> · {{ creditsLabel }}</span>
                  </span>
                  <label
                    v-if="post?.media?.length"
                    class="flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] moh-text-muted"
                  >
                    <input
                      type="checkbox"
                      class="accent-current"
                      :checked="includeImages"
                      :disabled="loading || peeking"
                      @change="toggleIncludeImages"
                    >
                    Images
                  </label>
                  <AppActionButton
                    v-if="result.stale"
                    :label="updateLabel"
                    :loading="loading"
                    marv
                    @click="regenerate"
                  />
                  <template v-else>
                    <AppActionButton
                      label="Regenerate"
                      kind="ghost"
                      :loading="loading"
                      :disabled="loading"
                      @click="regenerate"
                    />
                    <AppActionButton label="Done" :disabled="loading" @click="hide" />
                  </template>
                </template>
                <template v-else-if="errorMessage">
                  <span class="mr-auto text-[12px] moh-text-muted">{{ creditsLabel }}</span>
                  <AppActionButton
                    v-if="errorReason === 'no_credits'"
                    as="NuxtLink"
                    to="/tiers"
                    label="Get more credits"
                    kind="secondary"
                    @click="hide"
                  />
                  <AppActionButton label="Try again" :loading="loading" marv @click="run()" />
                </template>
                <template v-else-if="peeking">
                  <span class="mr-auto text-[12px] moh-text-muted">Checking for a recent summary…</span>
                </template>
                <template v-else>
                  <span class="mr-auto min-w-0 text-[12px] moh-text-muted">
                    {{ creditsLabel }}<span v-if="creditsLabel"> · </span>{{ preferredMode === 'auto' ? 'Auto picks the mode' : marvinModeLabel(preferredMode ?? 'auto') }}
                  </span>
                  <label
                    v-if="post?.media?.length"
                    class="flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] moh-text-muted"
                  >
                    <input
                      type="checkbox"
                      class="accent-current"
                      :checked="includeImages"
                      :disabled="loading || peeking"
                      @change="toggleIncludeImages"
                    >
                    Images
                  </label>
                  <AppActionButton
                    :label="loading ? 'Summarizing…' : 'Catch me up'"
                    :loading="loading"
                    marv
                    @click="run()"
                  />
                </template>
              </footer>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ClientOnly } from '#components'
import type { MarvinModeDto } from '~/types/api'
import { marvinModeLabel } from '~/utils/marvin-mode'

const { open, post, result, loading, peeking, errorMessage, errorReason, includeImages, hide, run, peek, reset, toggleIncludeImages } = useMarvCatchUp()
const { me, isAvailable, preferredMode, credits, setPreferredMode, ensureLoaded, startRealtime, marvDisplayName, marvUsername, marvAvatarUrl, marvAvatarVideo, marvUserId } = useMarv()

useOverlayDismiss(open, hide)

const { user } = useAuth()
watch(() => [user.value?.id, user.value?.impersonation, user.value?.accountSwitch], () => {
  hide()
  reset()
  post.value = null
  hasInitialized.value = false
})
const modeBusy = ref(false)

const hasInitialized = ref(false)
watch(open, async (isOpen) => {
  if (!isOpen || hasInitialized.value) return
  hasInitialized.value = true
  await ensureLoaded()
  startRealtime()
})

async function onPickMode(mode: MarvinModeDto) {
  if (modeBusy.value || loading.value || peeking.value) return
  if (mode === preferredMode.value) return
  modeBusy.value = true
  try {
    await setPreferredMode(mode)
    reset()
    await peek()
  } catch {
    // useMarv restores the previous mode on failure.
  } finally {
    modeBusy.value = false
  }
}

function regenerate() {
  void run({ refresh: true })
}

const marvName = computed(() => marvDisplayName.value || 'Marv')
const marvUser = computed(() => {
  if (!marvUserId.value) return null
  return {
    id: marvUserId.value,
    username: marvUsername.value || 'marv',
    name: marvName.value,
    avatarUrl: marvAvatarUrl.value,
    avatarVideo: marvAvatarVideo.value,
  }
})

const creditsLabel = computed(() => {
  const c = credits.value
  if (!c) return null
  return `${Math.floor(c.credits).toLocaleString()} credits`
})

const costBreakdownLabel = computed(() => {
  const r = result.value
  if (!r || r.creditsSpent === 0) return null
  const bd = r.costBreakdown
  const parts: string[] = []
  if (bd.mode > 0) parts.push(`${bd.mode} model`)
  if (bd.vision > 0) parts.push(`${bd.vision} image`)
  if (bd.webSearch > 0) parts.push(`${bd.webSearch} web search`)
  if (bd.urlFetch > 0) parts.push(`${bd.urlFetch} link`)
  if (parts.length === 0) return `${r.creditsSpent} credits`
  return `${r.creditsSpent} credit${r.creditsSpent !== 1 ? 's' : ''}: ${parts.join(' + ')}`
})

const stalenessLabel = computed(() => {
  const r = result.value
  if (!r?.stale) return null
  if (r.newReplies > 0) {
    return `${r.newReplies} new ${r.newReplies === 1 ? 'reply' : 'replies'} since this briefing`
  }
  return 'The thread was edited since this briefing'
})

const updateLabel = computed(() => {
  if (loading.value) return 'Summarizing…'
  const n = result.value?.newReplies ?? 0
  return n > 0 ? `Update — ${n} new` : 'Update'
})

const summaryMeta = computed(() => {
  const inc = result.value?.included
  if (!inc) return ''
  const above = inc.ancestors
  const below = inc.totalDescendants
  const parts: string[] = []
  if (above > 0) parts.push(`${above} ${above === 1 ? 'post' : 'posts'} above`)
  if (below > 0) parts.push(`${below} ${below === 1 ? 'reply' : 'replies'} below`)
  if (parts.length === 0) return 'Based on this post'
  return `Based on ${parts.join(' and ')}`
})

const postSectionLabel = computed(() =>
  (result.value?.included?.ancestors ?? 0) > 0 ? 'This post (in context)' : 'This post',
)
</script>
