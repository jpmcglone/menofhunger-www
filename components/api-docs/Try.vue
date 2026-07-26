<template>
  <div class="rounded-lg border border-[var(--moh-border-subtle)]">
    <form class="flex flex-col gap-2 p-3 sm:flex-row sm:items-start" @submit.prevent="onSubmit">
      <div class="relative min-w-0 flex-1">
        <label class="sr-only" :for="inputId">{{ label }}</label>
        <input
          :id="inputId"
          v-model="value"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          :role="suggestUsers ? 'combobox' : undefined"
          :aria-autocomplete="suggestUsers ? 'list' : undefined"
          :aria-expanded="suggestUsers ? open : undefined"
          :aria-controls="suggestUsers && open ? listboxId : undefined"
          :aria-activedescendant="activeOptionId"
          class="w-full rounded-md border border-[var(--moh-border-subtle)] bg-transparent px-3 py-2 font-mono text-sm text-gray-900 outline-none placeholder:font-sans placeholder:text-gray-400 focus:border-gray-400 dark:text-gray-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
          @input="onInput"
          @keydown="onKeydown"
          @blur="close"
        >

        <div
          v-if="suggestUsers && open"
          :id="listboxId"
          role="listbox"
          aria-label="Matching profiles"
          class="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-[var(--moh-border-subtle)] bg-white shadow-lg dark:bg-zinc-900"
        >
          <button
            v-for="(user, index) in results"
            :id="optionId(index)"
            :key="user.id"
            type="button"
            role="option"
            :aria-selected="index === highlighted"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left"
            :class="index === highlighted ? 'bg-gray-100 dark:bg-zinc-800' : ''"
            @mousedown.prevent
            @mouseenter="highlighted = index"
            @click="select(user)"
          >
            <img
              v-if="user.avatarUrl"
              :src="user.avatarUrl"
              alt=""
              class="h-6 w-6 shrink-0 rounded-full object-cover"
            >
            <span
              v-else
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold uppercase text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {{ (user.username ?? '?').slice(0, 1) }}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-50">
              {{ user.name || user.username }}
            </span>
            <span class="shrink-0 font-mono text-xs text-gray-400 dark:text-zinc-500">
              @{{ user.username }}
            </span>
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="!param || loading"
        class="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {{ loading ? 'Running…' : 'Run' }}
      </button>
    </form>

    <div class="relative flex items-center border-t border-[var(--moh-border-subtle)]">
      <code class="flex-1 overflow-x-auto whitespace-nowrap py-2 pl-3 pr-20 font-mono text-xs text-gray-400 dark:text-zinc-500">
        curl {{ previewUrl }}
      </code>
      <button
        type="button"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[var(--moh-border-subtle)] bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:text-zinc-100"
        @click="copyCurl"
      >
        {{ curlCopied ? 'Copied' : 'Copy' }}
      </button>
    </div>

    <div v-if="result" class="border-t border-[var(--moh-border-subtle)]">
      <p class="px-3 py-2 text-xs font-semibold" :class="result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
        {{ result.status }}
      </p>
      <pre class="max-h-96 overflow-auto border-t border-[var(--moh-border-subtle)] px-4 py-3 text-[13px] leading-relaxed"><code class="font-mono text-gray-800 dark:text-gray-200">{{ result.body }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiEnvelope, SearchUserResult } from '~/types/api'
import { useApiDocsUrl } from '~/config/api-docs'

const props = withDefaults(
  defineProps<{
    /** Accessible name for the input (visually hidden). */
    label: string
    placeholder: string
    /** Endpoint path up to the parameter, e.g. `/public/posts/`. */
    pathPrefix: string
    /** Placeholder text shown in the URL preview before anything is typed. */
    paramName: string
    initial?: string
    /** Offer live username suggestions while typing. */
    suggestUsers?: boolean
  }>(),
  { initial: '', suggestUsers: false },
)

const inputId = useId()
const listboxId = useId()
const value = ref(props.initial)
const loading = ref(false)

// When the parent fetches a default (e.g. latest post ID) after mount, apply it
// once — but only if the user hasn't typed anything yet.
watch(
  () => props.initial,
  (next) => {
    if (next && !value.value) value.value = next
  },
)
const result = ref<{ ok: boolean; status: string; body: string } | null>(null)

const { results, open, highlighted, search, move, close } = useApiDocsUserSuggest()
const { apiBaseUrl } = useApiDocsUrl()
const { copyText } = useCopyToClipboard()
const curlCopied = ref(false)
let curlResetTimer: ReturnType<typeof setTimeout> | null = null

async function copyCurl() {
  await copyText(`curl ${previewUrl.value}`)
  curlCopied.value = true
  if (curlResetTimer) clearTimeout(curlResetTimer)
  curlResetTimer = setTimeout(() => {
    curlCopied.value = false
  }, 1500)
}

onBeforeUnmount(() => {
  if (curlResetTimer) clearTimeout(curlResetTimer)
})

function optionId(index: number) {
  return `${listboxId}-option-${index}`
}

const activeOptionId = computed(() =>
  props.suggestUsers && open.value && highlighted.value >= 0 ? optionId(highlighted.value) : undefined,
)

/** Accept a raw id/username or a pasted permalink — keep the last path segment. */
const param = computed(() => {
  const trimmed = value.value.trim()
  if (!trimmed) return ''
  const withoutQuery = trimmed.split(/[?#]/)[0] ?? ''
  const segments = withoutQuery.split('/').filter(Boolean)
  return (segments.at(-1) ?? '').replace(/^@/, '')
})

const previewUrl = computed(
  () => `${apiBaseUrl.value}${props.pathPrefix}${param.value || props.paramName}`,
)

function onInput() {
  if (!props.suggestUsers) return
  search(value.value)
}

function highlightedUser() {
  if (!open.value || highlighted.value < 0) return null
  return results.value[highlighted.value] ?? null
}

function onKeydown(event: KeyboardEvent) {
  if (!props.suggestUsers) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Escape') {
    close()
  } else if (event.key === 'Enter') {
    // Handle Enter here rather than leaning on implicit form submission, so a
    // highlighted suggestion always wins over the raw text in the input.
    const picked = highlightedUser()
    if (!picked) return
    event.preventDefault()
    select(picked)
  }
}

function select(user: SearchUserResult) {
  value.value = user.username ?? ''
  close()
  void run()
}

function onSubmit() {
  close()
  void run()
}

const { apiFetch } = useApiClient()

async function run() {
  if (!param.value || loading.value) return
  loading.value = true
  result.value = null
  try {
    // `omit` proves the anonymous contract: these endpoints never read the session cookie.
    const envelope = await apiFetch<unknown>(`${props.pathPrefix}${encodeURIComponent(param.value)}`, {
      credentials: 'omit',
    })
    result.value = { ok: true, status: '200 OK', body: format(envelope) }
  } catch (error) {
    const failure = error as { statusCode?: number; status?: number; data?: unknown; message?: string }
    const status = failure.statusCode ?? failure.status
    result.value = {
      ok: false,
      status: status ? String(status) : 'Request failed',
      body: failure.data ? format(failure.data) : (failure.message ?? 'Request failed'),
    }
  } finally {
    loading.value = false
  }
}

function format(payload: ApiEnvelope<unknown> | unknown) {
  return JSON.stringify(payload, null, 2)
}
</script>
