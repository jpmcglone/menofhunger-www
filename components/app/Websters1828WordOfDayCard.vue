<template>
  <!-- When detailTo is provided the whole card is a click target (NuxtLink overlay),
       so right-click / cmd+click / middle-click all open the standalone page. -->
  <div
    class="moh-card moh-card-matte overflow-hidden rounded-2xl relative"
    :class="detailTo ? 'cursor-pointer' : ''"
  >
    <!-- Background anchor — handles right-click "Open in new tab" etc. -->
    <NuxtLink
      v-if="detailTo"
      :to="detailTo"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
      aria-hidden="true"
    />

    <!-- Card content sits above the overlay so normal interaction still works.
         Interactive children (expand button, external link) use @click.stop. -->
    <div class="relative z-[2]">
      <ClientOnly>
        <Transition name="wotd-fade" mode="out-in" appear>
          <!-- Loading skeleton -->
          <div v-if="pending" key="skeleton" class="animate-pulse px-4 py-4" aria-hidden="true">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1">
                <div class="h-4 w-11 rounded-full bg-gray-200 dark:bg-zinc-800" />
                <div class="h-3 w-16 rounded-full bg-gray-200 dark:bg-zinc-800" />
              </div>
            </div>
            <div class="mt-3 h-6 w-28 rounded bg-gray-200 dark:bg-zinc-800" />
            <div class="mt-2.5 space-y-1.5">
              <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-zinc-800" />
              <div class="h-3 w-5/6 rounded-full bg-gray-200 dark:bg-zinc-800" />
              <div class="h-3 w-4/6 rounded-full bg-gray-200 dark:bg-zinc-800" />
            </div>
          </div>

          <!-- Error state -->
          <div v-else-if="error" key="error" class="px-4 py-4 text-sm text-red-700 dark:text-red-300">
            Couldn't load the word of the day.
          </div>

          <!-- Content -->
          <div v-else-if="data?.word" key="content">
            <div class="px-4 pb-4 pt-4">
              <!-- Header row: pill label + external link -->
              <div class="flex items-center justify-between gap-3">
                <NuxtLink
                  v-if="detailTo"
                  :to="detailTo"
                  class="flex items-center gap-0.5 hover:opacity-75 transition-opacity"
                  @click.stop
                >
                  <span
                    class="inline-flex translate-y-[1px] items-center rounded-full border border-black/10 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                  >
                    Word
                  </span>
                  <span class="translate-x-[-1px] translate-y-[1px] text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    of the Day
                  </span>
                </NuxtLink>
                <div v-else class="flex items-center gap-0.5">
                  <span
                    class="inline-flex translate-y-[1px] items-center rounded-full border border-black/10 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                  >
                    Word
                  </span>
                  <span class="translate-x-[-1px] translate-y-[1px] text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    of the Day
                  </span>
                </div>
                <a
                  v-if="data.dictionaryUrl"
                  :href="data.dictionaryUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="moh-text-muted hover:moh-text inline-flex items-center gap-0.5 text-[11px] transition-colors"
                  aria-label="Open in Webster's 1828 Dictionary"
                  @click.stop
                >
                  <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
                </a>
              </div>

              <!-- Word -->
              <div
                class="moh-text mt-2.5 text-2xl font-semibold tracking-tight"
                style="font-family: var(--moh-font-serif);"
              >
                {{ data.word }}
              </div>

              <!-- Definition area -->
              <div v-if="hasDefinition" class="relative mt-1.5">
                <!-- Animated height wrapper -->
                <div
                  class="overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
                  :style="wrapperStyle"
                >
                  <!-- Unclamped inner content — measured by ResizeObserver -->
                  <div ref="contentEl">
                    <div
                      v-if="definitionHtml"
                      class="moh-wotd-definition moh-text text-sm leading-relaxed"
                      v-html="definitionHtml"
                    />
                    <div v-else class="moh-text space-y-2 text-sm leading-relaxed">
                      <p v-for="(p, idx) in paragraphs" :key="idx" class="whitespace-pre-wrap">{{ p }}</p>
                    </div>
                  </div>
                </div>

                <!-- Fade overlay when collapsed -->
                <div
                  v-if="canExpand"
                  class="pointer-events-none absolute inset-x-0 bottom-0 h-8 transition-opacity duration-300"
                  :class="expanded ? 'opacity-0' : 'opacity-100'"
                  :style="{ background: 'linear-gradient(to top, var(--moh-surface-2), transparent)' }"
                  aria-hidden="true"
                />
              </div>
            </div>

            <!-- Expand / collapse bar — only when content overflows collapsed height -->
            <button
              v-if="canExpand"
              type="button"
              class="moh-border moh-text-muted hover:moh-text flex h-7 w-full items-center justify-center border-t transition-colors"
              :aria-expanded="expanded"
              :aria-label="expanded ? 'Collapse definition' : 'Expand definition'"
              @click.stop="expanded = !expanded"
            >
              <Icon
                name="tabler:chevron-down"
                class="text-sm transition-transform duration-300"
                :class="{ 'rotate-180': expanded }"
                aria-hidden="true"
              />
            </button>
          </div>
        </Transition>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Websters1828WordOfDay } from '~/types/api'

defineProps<{
  /** When provided, the "Word of the Day" label becomes a NuxtLink to this route. */
  detailTo?: string
}>()

const { apiFetchData } = useApiClient()

const { data, pending, error, refresh } = useAsyncData<Websters1828WordOfDay>(
  'websters1828:wotd',
  async () => {
    return await apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd?includeDefinition=1', { method: 'GET' })
  },
  { server: false, lazy: true },
)

const { dayKey } = useEasternMidnightRollover()
watch(
  () => dayKey.value,
  async (next, prev) => {
    if (!import.meta.client) return
    if (!prev) return
    if (next === prev) return
    expanded.value = false
    await refresh()
  },
)

const definitionHtml = computed(() => {
  const html = data.value?.definitionHtml ?? null
  return html && html.trim() ? html : null
})

const paragraphs = computed(() => {
  const def = data.value?.definition ?? null
  if (!def) return []
  return def
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter(Boolean)
})

const hasDefinition = computed(() => Boolean(definitionHtml.value || paragraphs.value.length))

// Collapse / expand
const expanded = ref(false)
const contentEl = ref<HTMLElement | null>(null)
const contentHeight = ref(0)
const COLLAPSED_MAX_PX = 96

const canExpand = computed(() => contentHeight.value > COLLAPSED_MAX_PX + 8)

const wrapperStyle = computed(() => {
  if (!canExpand.value) return undefined
  return { maxHeight: expanded.value ? `${contentHeight.value}px` : `${COLLAPSED_MAX_PX}px` }
})

let ro: ResizeObserver | null = null

function attachObserver() {
  if (!contentEl.value) return
  ro?.disconnect()
  ro = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) contentHeight.value = Math.round(entry.contentRect.height)
  })
  ro.observe(contentEl.value)
}

onMounted(() => {
  attachObserver()
})

watch(
  () => data.value?.word,
  async () => {
    expanded.value = false
    await nextTick()
    attachObserver()
  },
)

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})
</script>

<style scoped>
.wotd-fade-enter-active {
  transition: opacity 0.35s ease;
}
.wotd-fade-leave-active {
  transition: opacity 0.2s ease;
}
.wotd-fade-enter-from,
.wotd-fade-leave-to {
  opacity: 0;
}

.moh-wotd-definition :deep(p) {
  margin: 0 0 0.75rem 0;
}
.moh-wotd-definition :deep(p:last-child) {
  margin-bottom: 0;
}
.moh-wotd-definition :deep(strong),
.moh-wotd-definition :deep(b) {
  font-weight: 700;
}
.moh-wotd-definition :deep(em),
.moh-wotd-definition :deep(i) {
  font-style: italic;
}
</style>
