<template>
  <Card class="moh-card moh-card-matte !rounded-2xl">
    <template #content>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-0.5">
          <span
            class="inline-flex items-center rounded-full border border-black/10 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 translate-y-[1px]"
          >
            Word
          </span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 tracking-[0.14em] translate-x-[-1px] translate-y-[1px]">
            of the Day
          </span>
        </div>
      </div>

      <ClientOnly>
        <div v-if="pending" class="mt-4 text-sm moh-text-muted">
          Loading…
        </div>
        <div v-else-if="error" class="mt-4 text-sm text-red-700 dark:text-red-300">
          Couldn’t load the word of the day.
        </div>
        <div v-else-if="data?.word" class="mt-5 flex items-end gap-3">
          <!-- Vertical pill marker -->
          <div class="h-9 w-1.5 rounded-full bg-gray-900 dark:bg-white opacity-20 shrink-0 translate-y-[1px]" aria-hidden="true" />
          <div
            class="text-3xl font-semibold tracking-tight moh-text"
            style="font-family: var(--moh-font-serif);"
          >
            {{ data.word }}
          </div>
        </div>

        <div v-if="data?.dictionaryUrl" class="mt-3 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center text-[11px] font-medium moh-text-muted hover:underline underline-offset-2"
            @mouseenter="onDefinitionTriggerEnter(data, $event)"
            @mousemove="onDefinitionTriggerMove"
            @mouseleave="onDefinitionTriggerLeave"
            @click="onDefinitionTriggerClick(data, $event)"
          >
            See definition
          </button>
        </div>
        <template #fallback>
          <div class="mt-4 text-sm moh-text-muted">Loading…</div>
        </template>
      </ClientOnly>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { Websters1828WordOfDay } from '~/types/api'

const { apiFetchData } = useApiClient()
const defPop = useWordDefinitionPopover()

const { data, pending, error, refresh } = useAsyncData<Websters1828WordOfDay>(
  'websters1828:wotd',
  async () => {
    return await apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd?includeDefinition=0', { method: 'GET' })
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
    await refresh()
  }
)

type HydratedDefinition = {
  definition: string | null
  definitionHtml: string | null
}

const hydratedDefinitionByWord = ref<Record<string, HydratedDefinition>>({})
const definitionLoadByWord = new Map<string, Promise<HydratedDefinition>>()

async function loadDefinitionForWord(payload: Websters1828WordOfDay): Promise<HydratedDefinition> {
  const wordKey = (payload.word ?? '').trim().toLowerCase()
  if (!wordKey) return { definition: null, definitionHtml: null }
  if (payload.definition?.trim() || payload.definitionHtml?.trim()) {
    return {
      definition: payload.definition?.trim() ? payload.definition : null,
      definitionHtml: payload.definitionHtml?.trim() ? payload.definitionHtml : null,
    }
  }
  const cached = hydratedDefinitionByWord.value[wordKey]
  const cachedHasHtml = typeof cached?.definitionHtml === 'string' && cached.definitionHtml.trim().length > 0
  // If we previously cached only plain text (older behavior), allow re-fetch to hydrate HTML styling.
  if (cached !== undefined && cachedHasHtml) {
    return cached
  }
  const existing = definitionLoadByWord.get(wordKey)
  if (existing) return await existing

  const p = apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd?includeDefinition=1', { method: 'GET' })
    .then((next) => {
      const hydrated: HydratedDefinition = {
        definition: next?.definition?.trim() ? next.definition : null,
        definitionHtml: next?.definitionHtml?.trim() ? next.definitionHtml : null,
      }
      hydratedDefinitionByWord.value = {
        ...hydratedDefinitionByWord.value,
        [wordKey]: hydrated,
      }
      return hydrated
    })
    .catch(() => ({ definition: null, definitionHtml: null }))
    .finally(() => {
      definitionLoadByWord.delete(wordKey)
    })

  definitionLoadByWord.set(wordKey, p)
  return await p
}

function onDefinitionTriggerEnter(payload: Websters1828WordOfDay, e: MouseEvent) {
  const hasRenderableDefinition = (v: string | null | undefined): boolean => {
    return typeof v === 'string' && v.trim().length > 0
  }
  const wordKey = (payload.word ?? '').trim().toLowerCase()
  const cached = wordKey ? hydratedDefinitionByWord.value[wordKey] : undefined
  defPop.onTriggerEnter({
    payload: {
      word: payload.word,
      definition: cached !== undefined ? cached.definition : (payload.definition ?? null),
      definitionHtml: cached !== undefined ? cached.definitionHtml : (payload.definitionHtml ?? null),
      sourceUrl: payload.sourceUrl || payload.dictionaryUrl,
    },
    event: e,
  })

  // Prefer HTML styling. If we only have plain text cached, fetch once to hydrate HTML.
  const hasKnownStyledDefinition = cached !== undefined
    ? hasRenderableDefinition(cached.definitionHtml)
    : hasRenderableDefinition(payload.definitionHtml)
  if (hasKnownStyledDefinition) return

  void loadDefinitionForWord(payload).then((hydrated) => {
    if (!hydrated.definition && !hydrated.definitionHtml) return
    const current = defPop.state.value.payload
    if (!current) return
    if ((current.word ?? '').trim().toLowerCase() !== wordKey) return
    defPop.state.value.payload = {
      ...current,
      definition: hydrated.definition,
      definitionHtml: hydrated.definitionHtml,
    }
  })
}
function onDefinitionTriggerMove(e: MouseEvent) {
  defPop.onTriggerMove(e)
}
function onDefinitionTriggerLeave() {
  defPop.onTriggerLeave()
}

function onDefinitionTriggerClick(payload: Websters1828WordOfDay, e: MouseEvent) {
  // Mobile: no hover, so click should open the popover.
  e.preventDefault()
  e.stopPropagation()

  const wordLower = (payload.word ?? '').trim().toLowerCase()
  const openWordLower = (defPop.state.value.payload?.word ?? '').trim().toLowerCase()
  if (defPop.state.value.open && wordLower && openWordLower === wordLower) {
    defPop.close()
    return
  }

  onDefinitionTriggerEnter(payload, e)
  defPop.lock()
}
</script>

