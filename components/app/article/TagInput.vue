<template>
  <div class="px-4 sm:px-6 lg:px-8" @keydown.esc="closeDropdown">
    <!-- Selected tag chips -->
    <div class="flex flex-wrap items-center gap-1.5 min-h-[2rem]">
      <TransitionGroup name="chip" tag="div" class="contents">
        <span
          v-for="tag in modelValue"
          :key="tag.tag"
          class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 group"
        >
          {{ tag.label }}
          <button
            type="button"
            class="flex h-3.5 w-3.5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 transition-colors"
            :aria-label="`Remove tag ${tag.label}`"
            @click="removeTag(tag.tag)"
          >
            <Icon name="tabler:x" class="text-[9px]" aria-hidden="true" />
          </button>
        </span>
      </TransitionGroup>

      <!-- Text input — hidden once max tags reached -->
      <div v-if="modelValue.length < MAX_TAGS" class="relative flex-1 min-w-[120px]">
        <input
          ref="inputEl"
          v-model="inputText"
          type="text"
          :placeholder="modelValue.length === 0 ? 'Add tags…' : 'Add another…'"
          :class="[
            'w-full border-0 bg-transparent py-0.5 text-xs text-gray-600 placeholder-gray-300 focus:outline-none dark:text-zinc-300 dark:placeholder-zinc-600',
            showAddAnotherHint ? 'pr-28 sm:pr-32' : '',
          ]"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          :aria-expanded="showDropdown"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          @input="onInput"
          @keydown.enter.prevent="commitInput"
          @keydown.tab="onTab"
          @keydown.backspace="onBackspace"
          @focus="onFocus"
          @blur="onBlur"
        />
        <div
          v-if="showAddAnotherHint"
          class="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          <kbd class="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-medium text-[9px] leading-none dark:border-zinc-700 dark:bg-zinc-800">Enter</kbd>
          <span>/</span>
          <kbd class="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-medium text-[9px] leading-none dark:border-zinc-700 dark:bg-zinc-800">Tab</kbd>
        </div>

        <!-- Autocomplete dropdown -->
        <Transition name="dropdown">
          <ul
            v-if="showDropdown && suggestions.length > 0"
            role="listbox"
            class="absolute left-0 top-full z-50 mt-1 max-h-48 w-48 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <li
              v-for="(s, i) in suggestions"
              :key="s.tag"
              role="option"
              :aria-selected="i === activeSuggestion"
              class="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs transition-colors"
              :class="i === activeSuggestion
                ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100'
                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60'"
              @mousedown.prevent="selectSuggestion(s)"
            >
              <span class="font-medium">{{ s.label }}</span>
              <span class="ml-2 text-gray-400 dark:text-zinc-500 uppercase">{{ s.kind }}</span>
            </li>
          </ul>
        </Transition>
      </div>

      <span v-if="modelValue.length >= MAX_TAGS" class="text-[10px] text-gray-400 dark:text-zinc-600 ml-1">
        Max {{ MAX_TAGS }} tags
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArticleTag } from '~/types/api'

const MAX_TAGS = 10
const AUTOCOMPLETE_DEBOUNCE_MS = 200

const props = defineProps<{
  modelValue: ArticleTag[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', tags: ArticleTag[]): void
}>()

const { apiFetchData } = useApiClient()

const inputEl = ref<HTMLInputElement | null>(null)
const inputText = ref('')
const isInputFocused = ref(false)
const hasCommitCandidate = computed(() => {
  return inputText.value.trim().replace(/,+$/, '').trim().length > 0
})
const hasActiveSuggestion = computed(() => {
  return activeSuggestion.value >= 0 && activeSuggestion.value < suggestions.value.length
})
const showAddAnotherHint = computed(() => {
  return isInputFocused.value && (hasCommitCandidate.value || hasActiveSuggestion.value)
})
const suggestions = ref<Array<{ tag: string; label: string; kind: 'topic' | 'subtopic' | 'tag' }>>([])
const activeSuggestion = ref(-1)
const showDropdown = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let fetchSeq = 0

// ─── Tag normalization (mirrors API slugify) ──────────────────────────────────
function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

// ─── Autocomplete fetch ───────────────────────────────────────────────────────
function fetchSuggestions(q: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = q.trim()
  if (!trimmed) {
    suggestions.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    const seq = ++fetchSeq
    try {
      const res = await apiFetchData<Array<{ slug: string; label: string; kind: 'topic' | 'subtopic' | 'tag' }>>(
        '/taxonomy/search',
        { query: { q: trimmed } },
      )
      if (seq !== fetchSeq) return
      const existingTags = new Set(props.modelValue.map((t) => t.tag))
      suggestions.value = (Array.isArray(res) ? res : [])
        .map((s) => ({ tag: s.slug, label: s.label, kind: s.kind }))
        .filter((s) => !existingTags.has(s.tag))
      activeSuggestion.value = -1
    } catch {
      if (seq !== fetchSeq) return
      suggestions.value = []
    }
  }, AUTOCOMPLETE_DEBOUNCE_MS)
}

// ─── Input handlers ───────────────────────────────────────────────────────────
function onInput() {
  // UX: "tag, " should commit the tag just like Enter/Tab.
  const commaSpaceMatch = inputText.value.match(/^(.*?),\s+$/)
  if (commaSpaceMatch?.[1]) {
    commitRaw(commaSpaceMatch[1])
    return
  }
  showDropdown.value = true
  activeSuggestion.value = -1
  fetchSuggestions(inputText.value)
}

function onFocus() {
  isInputFocused.value = true
  if (inputText.value.trim()) {
    showDropdown.value = true
    fetchSuggestions(inputText.value)
  }
}

function onBlur() {
  isInputFocused.value = false
  // Delay so mousedown on a suggestion fires first.
  setTimeout(() => { showDropdown.value = false }, 150)
}

function onTab(e: KeyboardEvent) {
  const activeSug = activeSuggestion.value >= 0 ? suggestions.value[activeSuggestion.value] : undefined
  if (activeSug) {
    e.preventDefault()
    selectSuggestion(activeSug)
  } else if (inputText.value.trim()) {
    e.preventDefault()
    commitInput()
  }
}

function onBackspace() {
  if (!inputText.value && props.modelValue.length > 0) {
    const last = props.modelValue[props.modelValue.length - 1]
    if (last) removeTag(last.tag)
  }
}

// Arrow key navigation in dropdown
function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value || !suggestions.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeSuggestion.value = Math.min(activeSuggestion.value + 1, suggestions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeSuggestion.value = Math.max(activeSuggestion.value - 1, -1)
  }
}

// ─── Tag commit ───────────────────────────────────────────────────────────────
function commitInput() {
  const activeSug = activeSuggestion.value >= 0 ? suggestions.value[activeSuggestion.value] : undefined
  if (activeSug) {
    selectSuggestion(activeSug)
    return
  }
  commitRaw(inputText.value)
}

function commitRaw(rawValue: string) {
  const raw = rawValue.trim().replace(/,+$/, '').trim()
  if (!raw) return
  addTag({ label: raw, tag: normalizeTag(raw) })
}

function selectSuggestion(s: { tag: string; label: string }) {
  addTag(s)
}

function addTag(t: { tag: string; label: string }) {
  if (!t.tag) return
  if (props.modelValue.length >= MAX_TAGS) return
  if (props.modelValue.some((e) => e.tag === t.tag)) {
    inputText.value = ''
    closeDropdown()
    return
  }
  emit('update:modelValue', [...props.modelValue, { tag: t.tag, label: t.label }])
  inputText.value = ''
  suggestions.value = []
  closeDropdown()
  nextTick(() => inputEl.value?.focus())
}

function removeTag(slug: string) {
  emit('update:modelValue', props.modelValue.filter((t) => t.tag !== slug))
}

function closeDropdown() {
  showDropdown.value = false
  activeSuggestion.value = -1
}

// Wire up arrow-key navigation at the input level.
onMounted(() => {
  inputEl.value?.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  inputEl.value?.removeEventListener('keydown', onKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
  fetchSeq++
})
</script>

<style scoped>
.chip-enter-active,
.chip-leave-active {
  transition: all 0.15s ease;
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
