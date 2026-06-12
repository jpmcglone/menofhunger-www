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
              class="moh-surface flex h-[34rem] max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-lg sm:rounded-2xl"
            >
              <!-- Header -->
              <header class="flex items-center gap-3 border-b moh-border px-4 py-3">
                <AppMarvMark :size="28" />
                <div class="min-w-0 flex-1">
                  <h2 class="moh-h3 leading-tight">Catch me up</h2>
                  <p class="text-xs text-gray-500 dark:text-gray-400">M.A.R.V summarizes this conversation</p>
                </div>
                <button
                  type="button"
                  class="moh-tap inline-flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  aria-label="Close"
                  @click="hide"
                >
                  <Icon name="tabler:x" class="text-[18px]" aria-hidden="true" />
                </button>
              </header>

              <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <!-- Mode picker (premium only) -->
                <div v-if="isAvailable" class="mb-3 flex items-center gap-2">
                  <div class="flex min-w-0 flex-1 rounded-lg border moh-border p-0.5">
                    <button
                      v-for="m in (['auto', 'fast', 'regular', 'smart'] as const)"
                      :key="m"
                      type="button"
                      :disabled="modeBusy || loading || peeking"
                      class="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                      :class="
                        preferredMode === m
                          ? 'bg-violet-600 text-white dark:bg-violet-500'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                      "
                      @click="onPickMode(m)"
                    >
                      <Icon :name="modeIcon(m)" class="text-[11px] shrink-0" aria-hidden="true" />
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
                    class="shrink-0 inline-flex items-center gap-1 text-[11px] tabular-nums text-gray-500 dark:text-gray-400"
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

                <!-- Focal post preview (always shown) -->
                <div
                  v-if="post"
                  class="mb-3 rounded-xl border moh-border p-3"
                  aria-hidden="true"
                >
                    <div class="flex items-start gap-2.5">
                      <AppAvatarCircle
                        :src="post.author.avatarUrl ?? null"
                        :name="post.author.name ?? null"
                        :username="post.author.username ?? null"
                        size-class="h-7 w-7"
                        :round-class="post.author.isOrganization ? 'rounded-lg' : 'rounded-full'"
                        bg-class="bg-gray-200 dark:bg-zinc-700"
                        class="mt-0.5 shrink-0"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-[13px] font-semibold leading-tight text-gray-900 dark:text-white">
                          {{ post.author.name || post.author.username || 'User' }}
                          <span class="ml-1 font-normal text-gray-400 dark:text-gray-500">@{{ post.author.username }}</span>
                        </p>
                        <p
                          v-if="post.body"
                          class="mt-0.5 line-clamp-3 text-[13px] leading-snug text-gray-700 dark:text-gray-300"
                        >{{ post.body }}</p>
                        <!-- First image thumbnail if present -->
                        <div
                          v-if="post.media?.length"
                          class="mt-1.5 flex gap-1"
                        >
                          <div
                            v-for="m in post.media.slice(0, 3)"
                            :key="m.id"
                            class="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-zinc-700"
                          >
                            <AppImg
                              v-if="m.url"
                              :src="m.url"
                              alt=""
                              class="h-full w-full object-cover"
                              width="48"
                              height="48"
                              sizes="48px"
                            />
                          </div>
                          <div
                            v-if="post.media.length > 3"
                            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-200 text-[11px] font-semibold text-gray-500 dark:bg-zinc-700 dark:text-gray-400"
                          >+{{ post.media.length - 3 }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                <!-- Non-premium upsell (below the post preview) -->
                <div
                  v-if="!isAvailable"
                  class="flex flex-col items-center justify-center py-6 text-center"
                >
                  <Icon name="tabler:lock" class="mb-3 text-[28px] moh-text-muted opacity-50" aria-hidden="true" />
                  <p class="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">Premium feature</p>
                  <p class="mb-5 max-w-xs text-[13px] text-gray-500 dark:text-gray-400">
                    M.A.R.V reads the full thread — above and below — and gives you the gist in seconds.
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

                <!-- Premium states: result / loading / peeking / error / idle -->
                <template v-else>
                  <!-- Result -->
                  <div v-if="result" class="rounded-xl border moh-border p-3">
                    <!-- Two-section layout when the API parsed POST:/REPLIES: markers -->
                    <template v-if="result.sections">
                      <p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{{ postSectionLabel }}</p>
                      <p class="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-100">{{ result.sections.post }}</p>
                      <template v-if="result.sections.replies">
                        <p class="mb-0.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Replies</p>
                        <p class="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-100">{{ result.sections.replies }}</p>
                      </template>
                    </template>
                    <!-- Single-blob fallback (no replies, or model didn't follow the format) -->
                    <p v-else class="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-100">{{ result.summary }}</p>
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
                  </div>

                  <!-- Loading (paid generation) -->
                  <div v-else-if="loading" class="space-y-2 py-2" aria-live="polite">
                    <p class="text-sm text-gray-500 dark:text-gray-400">Analyzing thread…</p>
                    <div class="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                    <div class="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                    <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>

                  <!-- Peeking the cache (free, fast) -->
                  <div v-else-if="peeking" class="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                    <Icon name="tabler:loader-2" class="animate-spin text-[15px]" aria-hidden="true" />
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
                    <AppMarvMark :size="32" class="mb-3 opacity-40" />
                    <p class="mb-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                      M.A.R.V will read this whole thread and give you the gist.
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
              </div>

              <!-- Footer actions -->
              <footer v-if="isAvailable" class="flex items-center justify-end gap-2 border-t moh-border px-4 py-3">
                <template v-if="result">
                  <Button label="Regenerate" severity="secondary" text :disabled="loading" @click="regenerate" />
                  <Button label="Done" rounded @click="hide" />
                </template>
                <template v-else-if="errorMessage">
                  <!-- Error state: offer a retry + close -->
                  <Button label="Cancel" severity="secondary" text @click="hide" />
                  <Button label="Try again" :loading="loading" rounded @click="run()" />
                </template>
                <template v-else-if="peeking">
                  <!-- Checking cache: just a cancel -->
                  <Button label="Cancel" severity="secondary" text @click="hide" />
                </template>
                <template v-else>
                  <!-- Idle (no cached summary): explicit opt-in to generate -->
                  <Button label="Cancel" severity="secondary" text @click="hide" />
                  <Button
                    :label="loading ? 'Summarizing…' : 'Catch me up'"
                    :loading="loading"
                    rounded
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

const { open, post, result, loading, peeking, errorMessage, errorReason, includeImages, hide, run, peek, reset, toggleIncludeImages } = useMarvCatchUp()
const { me, isAvailable, preferredMode, credits, setPreferredMode, ensureLoaded, startRealtime } = useMarv()

// Close on Escape — the backdrop div never receives focus so @keydown.escape on it is a no-op.
// A document-level listener is the reliable approach for modals.
function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') hide()
}
watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) document.addEventListener('keydown', onDocKeydown)
  else document.removeEventListener('keydown', onDocKeydown)
})
onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('keydown', onDocKeydown)
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
  reset()
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
