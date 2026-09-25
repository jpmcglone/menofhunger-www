<template>
  <div class="relative">
    <div
      class="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border moh-border px-2 py-1.5 focus-within:border-[var(--moh-text-muted)]"
      @click="inputEl?.focus()"
    >
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
        style="color: var(--moh-verified); border-color: var(--moh-verified)"
      >
        {{ tag }}
        <button type="button" class="moh-focus rounded-full" :aria-label="`Remove ${tag}`" @click.stop="remove(tag)">
          <Icon name="tabler:x" class="text-[11px]" aria-hidden="true" />
        </button>
      </span>
      <input
        v-if="modelValue.length < max"
        ref="inputEl"
        v-model="draft"
        type="text"
        :placeholder="modelValue.length ? `Add tag (${max - modelValue.length} left)` : placeholder"
        class="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none moh-text placeholder:text-[var(--moh-text-soft)]"
        :aria-label="placeholder"
        maxlength="24"
        @keydown="onKeydown"
        @focus="focused = true"
        @blur="onBlur"
      >
    </div>
    <div
      v-if="focused && suggestions.length && modelValue.length < max"
      class="mt-1 flex flex-wrap gap-1.5 rounded-xl border moh-border moh-surface p-2"
      :class="inlineSuggestions ? '' : 'absolute left-0 right-0 z-20 shadow-lg'"
    >
      <button
        v-for="s in suggestions"
        :key="s.slug"
        type="button"
        class="moh-focus rounded-full border moh-border px-2.5 py-1 text-xs moh-text-muted hover:text-[var(--moh-text)] hover:bg-[var(--moh-surface-hover)]"
        @mousedown.prevent="commit(s.slug)"
      >
        {{ s.slug }}<span v-if="s.threadCount" class="ml-1 moh-text-soft">{{ s.threadCount }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BoardTag } from '~/types/api'

const props = withDefaults(defineProps<{
  modelValue: string[]
  max?: number
  placeholder?: string
  /** Render suggestions in flow (inside scrolling menus) instead of floating over content. */
  inlineSuggestions?: boolean
}>(), {
  max: 3,
  placeholder: 'Add a tag…',
  inlineSuggestions: false,
})
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const api = useBoardApi()
const inputEl = ref<HTMLInputElement | null>(null)
const draft = ref('')
const focused = ref(false)
const suggestions = ref<BoardTag[]>([])
let seq = 0

function slugify(raw: string): string {
  return raw.trim().replace(/^#+/, '').toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24)
}

function commit(raw: string) {
  const slug = slugify(raw)
  draft.value = ''
  if (slug.length < 2 || props.modelValue.includes(slug) || props.modelValue.length >= props.max) return
  emit('update:modelValue', [...props.modelValue, slug])
}

function remove(tag: string) {
  emit('update:modelValue', props.modelValue.filter((t) => t !== tag))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commit(draft.value)
  } else if (e.key === 'Backspace' && draft.value === '' && props.modelValue.length) {
    remove(props.modelValue[props.modelValue.length - 1]!)
  }
}

function onBlur() {
  focused.value = false
  if (draft.value.trim()) commit(draft.value)
}

async function refresh() {
  const current = ++seq
  try {
    const rows = await api.listTags(slugify(draft.value))
    if (current === seq) suggestions.value = rows.filter((r) => !props.modelValue.includes(r.slug)).slice(0, 10)
  } catch {
    if (current === seq) suggestions.value = []
  }
}

watch([draft, focused], ([, isFocused]) => {
  if (isFocused) void refresh()
})
</script>
