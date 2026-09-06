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
            <section
              class="moh-surface flex h-[min(37.5rem,90dvh)] max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-xl sm:rounded-2xl"
            >
              <!-- Header -->
              <header class="shrink-0 flex items-center gap-3 px-5 py-4">
                <AppIconGlyph name="catchup" :size="26" />
                <div class="min-w-0 flex-1">
                  <h2 class="moh-h3 leading-tight">Catch me up</h2>
                  <p class="mt-1 flex items-center gap-1 text-xs moh-text-muted"><AppMarvMark :size="12" />Your thread summary, by MARV</p>
                </div>
                <button
                  type="button"
                  class="moh-tap inline-flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  aria-label="Close"
                  @click="hide"
                >
                  <Icon name="tabler:x" class="text-[18px]" aria-hidden="true" />
                </button>
              </header>

              <div class="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 py-5 sm:px-6">
                <AppMarvSourcePost v-if="post && !result" :post="post" />

                <!--
                  Non-premium. Two shapes: if someone already summarized this thread we show
                  their summary (free, already cached) with the upgrade CTA underneath — real
                  output beats a locked door as a funnel. Otherwise the plain upsell.
                -->
                <div v-if="!isAvailable">
                  <div v-if="result" class="space-y-4 py-2">
                    <h3 class="text-lg font-semibold">The gist</h3>
                    <AppMarvMarkdown class="text-base leading-relaxed" :text="result.summary" />
                    <p class="mt-3 text-[11px] text-gray-400 dark:text-gray-500">{{ stalenessLabel || summaryMeta }}</p>
                  </div>
                  <div class="flex flex-col items-center justify-center py-6 text-center">
                    <Icon
                      v-if="!result"
                      name="tabler:lock"
                      class="mb-3 text-[28px] moh-text-muted opacity-50"
                      aria-hidden="true"
                    />
                    <p class="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {{ result ? 'Want your own?' : 'Premium feature' }}
                    </p>
                    <p class="mb-5 max-w-xs text-[13px] text-gray-500 dark:text-gray-400">
                      {{
                        result
                          ? 'A member summarized this thread. Premium lets you catch up on any thread, any time.'
                          : 'M.A.R.V reads the full thread — above and below — and gives you the gist in seconds.'
                      }}
                    </p>
                    <Button
                      as="NuxtLink"
                      to="/tiers"
                      label="Upgrade to Premium"
                      rounded
                      class="w-full max-w-[200px]"
                      @click="hide"
                    />
                    <button
                      type="button"
                      class="mt-3 text-[13px] text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                      @click="hide"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>

                <!-- Premium states: result / loading / peeking / error / idle -->
                <template v-else>
                  <!-- Result -->
                  <div v-if="result" class="space-y-4 py-2">
                    <h3 class="text-lg font-semibold">The gist</h3>
                    <!--
                      Stale banner: the thread moved on since this summary. Shown above the
                      text so the reader knows what they're looking at before they read it.
                    -->
                    <p
                      v-if="result.stale"
                      class="mb-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      <Icon name="tabler:clock" class="text-[11px] shrink-0" aria-hidden="true" />
                      {{ stalenessLabel }}
                    </p>
                    <!-- Two-section layout when the API parsed POST:/REPLIES: markers -->
                    <template v-if="result.sections">
                      <!--
                        Delta first: when the viewer had already summarized this thread, what
                        changed since is the only part they haven't read.
                      -->
                      <template v-if="result.sections.since">
                        <p class="mb-1 text-sm font-semibold moh-text">What's new</p>
                        <AppMarvMarkdown class="text-base leading-relaxed" :text="result.sections.since" />
                      </template>
                      <p class="sr-only">{{ postSectionLabel }}</p>
                      <AppMarvMarkdown class="text-base leading-relaxed" :text="result.sections.post" />
                      <template v-if="result.sections.replies">
                        <p class="mb-1 mt-5 text-sm font-semibold moh-text">In the replies</p>
                        <AppMarvMarkdown class="text-base leading-relaxed" :text="result.sections.replies" />
                      </template>
                    </template>
                    <!-- Single-blob fallback (no replies, or model didn't follow the format) -->
                    <AppMarvMarkdown v-else class="text-base leading-relaxed" :text="result.summary" />
                    <details class="pt-2 text-xs moh-text-muted">
                      <summary class="min-h-11 cursor-pointer py-3">Sources · {{ summaryMeta }}</summary>
                      <AppMarvSourcePost v-if="post" :post="post" />
                    <p class="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                      {{ summaryMeta }}
                      <span v-if="result.cached"> · cached</span>
                    </p>
                    <p
                      v-if="costBreakdownLabel"
                      class="mt-1 inline-flex items-center gap-1 text-[11px] tabular-nums text-gray-400 dark:text-gray-500"
                    >
                      <Icon name="tabler:bolt" class="text-[11px] text-amber-500" aria-hidden="true" />
                      {{ costBreakdownLabel }}
                    </p>
                    </details>
                  </div>

                  <!-- Loading (paid generation) -->
                  <div v-else-if="loading" class="space-y-2 py-2" aria-live="polite">
                    <p class="flex items-center gap-2 text-sm moh-text-muted"><AppMarvMark :size="24" loading />Finding the useful parts…</p>
                    <div class="h-3 w-5/6 motion-safe:animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                    <div class="h-3 w-full motion-safe:animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                    <div class="h-3 w-2/3 motion-safe:animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>

                  <!-- Peeking the cache (free, fast) -->
                  <div v-else-if="peeking" class="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                    <AppMarvMark :size="20" loading />
                    Checking for a recent summary…
                  </div>

                  <!-- Error -->
                  <div
                    v-else-if="errorMessage"
                    class="rounded-xl border border-rose-300/60 bg-rose-50 p-3 text-sm dark:border-rose-500/30 dark:bg-rose-500/10"
                  >
                    <p class="text-rose-800 dark:text-rose-200">{{ errorMessage }}</p>
                    <Button
                      v-if="errorReason === 'no_credits'"
                      as="NuxtLink"
                      to="/tiers"
                      label="Get more credits"
                      severity="secondary"
                      rounded
                      class="mt-2"
                      @click="hide"
                    />
                  </div>

                  <!-- Idle: no cached summary — explicit opt-in -->
                  <div v-else class="flex flex-col items-center justify-center py-6 text-center">
                    <AppIconGlyph name="catchup" :size="32" class="mb-3" />
                    <p class="mb-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                      Get the key points, useful replies, and what changed.
                    </p>
                    <ul class="space-y-2 text-left text-[13px] text-gray-500 dark:text-gray-400">
                      <li class="flex items-center gap-2">
                        <Icon name="tabler:arrow-up" class="shrink-0 text-[13px]" aria-hidden="true" />
                        Posts and replies above this one
                      </li>
                      <li class="flex items-center gap-2">
                        <Icon name="tabler:arrow-down" class="shrink-0 text-[13px]" aria-hidden="true" />
                        All replies below this one
                      </li>
                      <li class="flex items-center gap-2">
                        <Icon name="tabler:photo" class="shrink-0 text-[13px]" aria-hidden="true" />
                        Images and links in the thread
                      </li>
                      <li class="flex items-center gap-2">
                        <Icon name="tabler:world" class="shrink-0 text-[13px]" aria-hidden="true" />
                        Web context when relevant
                      </li>
                    </ul>
                  </div>
                </template>
                <p v-if="result && loading" class="mt-3 text-xs moh-text-muted" role="status">Updating your summary…</p>
                <p v-if="result && errorMessage" class="mt-3 text-sm text-rose-600" role="alert">{{ errorMessage }}</p>
                <AppMarvParticipation v-if="post && result" :key="post.id" :post-id="post.id" class="mt-6" @navigate="hide" />
              </div>

              <details v-if="isAvailable" class="shrink-0 border-t moh-border px-5" :open="!result && !loading && !peeking">
                <summary class="flex min-h-12 cursor-pointer list-none items-center gap-2 text-xs moh-text-muted">
                  <AppIconGlyph name="settings" :size="16" />
                  <span class="flex-1">Summary settings · {{ modeLabel(preferredMode ?? 'auto') }}</span>
                  <span>{{ creditsLabel }}</span>
                  <AppIconGlyph name="forward" :size="14" />
                </summary>
                <div class="max-h-40 overflow-y-auto pb-3">
                <!-- Mode picker (premium only) -->
                <div v-if="isAvailable" class="mb-3 flex flex-wrap items-center gap-2">
                  <div class="flex w-full min-w-0 rounded-lg border moh-border p-0.5 sm:w-auto sm:flex-1">
                    <button
                      v-for="m in (['auto', 'fast', 'regular', 'smart'] as const)"
                      :key="m"
                      type="button"
                      :disabled="modeBusy || loading || peeking"
                      class="flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 sm:px-2"
                      :class="
                        preferredMode === m
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                      "
                      @click="onPickMode(m)"
                    >
                      <AppMarvMark v-if="m === 'auto'" :size="13" />
                      <Icon v-else :name="modeIcon(m)" class="hidden shrink-0 text-[11px] sm:block" aria-hidden="true" />
                      <span>{{ modeLabel(m) }}</span>
                      <span
                        v-if="modeCost(m) !== null"
                        class="inline-flex items-center gap-0.5 tabular-nums opacity-70 text-[10px]"
                        aria-hidden="true"
                      >
                        <Icon name="tabler:bolt" class="text-amber-400 text-[9px]" />{{ modeCost(m) }}
                      </span>
                    </button>
                  </div>
                  <span
                    v-if="creditsLabel"
                    class="ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] tabular-nums text-gray-500 dark:text-gray-400"
                  >
                    <Icon name="tabler:bolt" class="text-[11px] text-amber-500" aria-hidden="true" />
                    {{ creditsLabel }}
                  </span>
                </div>

                <!-- Include images toggle -->
                <div
                  v-if="post?.media?.length"
                  class="mb-3 flex items-center justify-between"
                >
                  <label class="flex cursor-pointer items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      class="accent-violet-600"
                      :checked="includeImages"
                      :disabled="loading || peeking"
                      @change="toggleIncludeImages"
                    />
                    <span class="text-[13px] text-gray-600 dark:text-gray-300">Include images</span>
                  </label>
                  <span class="text-[11px] text-gray-400 dark:text-gray-500">
                    <Icon name="tabler:bolt" class="text-[10px] text-amber-500" aria-hidden="true" />
                    +{{ me?.costs?.visionPerImage ?? 1 }} per image
                  </span>
                </div>


                  <Button v-if="result && !result.stale" label="Regenerate summary" text severity="secondary" :disabled="loading" @click="regenerate" />
                </div>
              </details>

              <!-- Footer actions -->
              <footer v-if="isAvailable" class="min-h-[72px] shrink-0 flex items-center justify-end gap-2 border-t moh-border px-4 py-3">
                <template v-if="result">
                  <!--
                    When the thread has moved on, updating is the useful action and gets
                    primary weight. When nothing has changed, say so and keep regenerate
                    quiet — spending credits to re-summarize an unchanged thread is waste.
                  -->
                  <span v-if="!result.stale" class="mr-auto text-[11px] text-gray-400 dark:text-gray-500">
                    Up to date
                  </span>
                  <template v-if="result.stale">
                    <AppActionButton label="Done" kind="secondary" @click="hide" />
                    <AppActionButton :label="updateLabel" :loading="loading" @click="regenerate"  marv />
                  </template>
                  <template v-else>

                    <AppActionButton label="Back to conversation" @click="hide" />
                  </template>
                </template>
                <template v-else-if="errorMessage">
                  <!-- Error state: offer a retry + close -->
                  <AppActionButton label="Cancel" kind="secondary" @click="hide" />
                  <AppActionButton label="Try again" :loading="loading" @click="run()"  marv />
                </template>
                <template v-else-if="peeking">
                  <!-- Checking cache: just a cancel -->
                  <AppActionButton label="Cancel" kind="secondary" @click="hide" />
                </template>
                <template v-else>
                  <!-- Idle (no cached summary): explicit opt-in to generate -->
                  <AppActionButton label="Cancel" kind="secondary" @click="hide" />
                  <AppActionButton
                    :label="loading ? 'Summarizing…' : 'Catch me up'"
                    :loading="loading"

                    @click="run()"
                   marv />
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

const { open, post, result, loading, peeking, errorMessage, errorReason, includeImages, hide, run, peek, reset, toggleIncludeImages } = useMarvCatchUp()
const { me, isAvailable, preferredMode, credits, setPreferredMode, ensureLoaded, startRealtime } = useMarv()

// Escape, the Android/browser Back button, and route changes all dismiss this.
// The backdrop div never receives focus, so the template's @keydown.escape is a no-op
// on its own — the shared stack is what actually closes this.
useOverlayDismiss(open, hide)

const { user } = useAuth()
watch(() => [user.value?.id, user.value?.impersonation, user.value?.accountSwitch], () => {
  hide()
  reset()
  post.value = null
  hasInitialized.value = false
})
const modeBusy = ref(false)

// Load Marv state + start the credits subscription the first time the modal opens
// (avoids fetching /marvin/me on every page load when the modal is never used).
const hasInitialized = ref(false)
watch(open, async (isOpen) => {
  if (!isOpen || hasInitialized.value) return
  hasInitialized.value = true
  await ensureLoaded()
  startRealtime()
})

function modeLabel(m: MarvinModeDto): string {
  if (m === 'auto') return 'Auto'
  if (m === 'fast') return 'Fast'
  if (m === 'smart') return 'Smart'
  return 'Regular'
}

function modeIcon(m: MarvinModeDto): string {
  if (m === 'auto') return 'tabler:sparkles'
  if (m === 'fast') return 'tabler:bolt'
  if (m === 'smart') return 'tabler:brain'
  return 'tabler:scale'
}

async function onPickMode(mode: MarvinModeDto) {
  if (modeBusy.value || loading.value || peeking.value) return
  if (mode === preferredMode.value) return
  modeBusy.value = true
  try {
    await setPreferredMode(mode)
    // Switching tiers must never silently spend credits. Reset and PEEK the new tier's cache:
    // if you've used this tier on this thread before, it shows instantly and free; otherwise
    // the modal drops to the idle CTA so generating under the new tier is an explicit choice.
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

const creditsLabel = computed(() => {
  const c = credits.value
  if (!c) return null
  return `${Math.floor(c.credits).toLocaleString()} credits`
})

function modeCost(m: MarvinModeDto): number | null {
  const costs = me.value?.costs
  if (!costs) return null
  if (m === 'auto') return null
  if (m === 'fast') return costs.fast
  if (m === 'regular') return costs.regular
  if (m === 'smart') return costs.smart
  return null
}

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

/**
 * How far the thread has drifted since this summary was written. The API serves stale
 * summaries free rather than paywalling them, so the label is what makes the trade-off
 * legible: read this now, or spend to bring it current.
 */
const stalenessLabel = computed(() => {
  const r = result.value
  if (!r?.stale) return null
  if (r.newReplies > 0) {
    return `${r.newReplies} new ${r.newReplies === 1 ? 'reply' : 'replies'} since this summary`
  }
  return 'The thread was edited since this summary'
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

// When the focal post sits under an ancestor path, "The post" summary is read in
// context of what's above it — signal that so the label isn't mistaken for the
// post in isolation.
const postSectionLabel = computed(() =>
  (result.value?.included?.ancestors ?? 0) > 0 ? 'This post (in context)' : 'This post',
)
</script>
