<template>
  <div ref="wrapEl" class="relative shrink-0">
    <button
      type="button"
      class="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border moh-border moh-surface hover:moh-surface-hover px-3 text-sm font-semibold moh-text transition-colors"
      :aria-label="`Folder: ${folderLabel}`"
      @click="open = !open"
    >
      <Icon
        :name="activeSlug === null ? 'tabler:bookmark-filled' : activeSlug === 'unorganized' ? 'tabler:inbox' : 'tabler:folder'"
        class="shrink-0 text-base text-[var(--p-primary-color)]"
        aria-hidden="true"
      />
      <span class="truncate max-w-[8rem] sm:max-w-[12rem]">{{ folderLabel }}</span>
      <Icon name="tabler:chevron-down" class="text-xs opacity-70 shrink-0" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border moh-border moh-bg shadow-lg"
      role="menu"
      aria-label="Select folder"
    >
      <button
        type="button"
        class="w-full text-left px-3 py-2.5 text-sm font-semibold transition-colors moh-text hover:moh-surface-hover flex items-center gap-2"
        role="menuitem"
        @click="goTo('')"
      >
        <Icon
          :name="activeSlug === null ? 'tabler:bookmark-filled' : 'tabler:bookmark'"
          :class="['text-base shrink-0', activeSlug === null ? 'text-[var(--p-primary-color)]' : 'moh-text']"
          aria-hidden="true"
        />
        <span class="flex-1">All</span>
        <Icon v-if="activeSlug === null" name="tabler:check" class="text-xs shrink-0" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-2.5 text-sm font-semibold transition-colors moh-text hover:moh-surface-hover flex items-center gap-2"
        role="menuitem"
        @click="goTo('unorganized')"
      >
        <Icon
          name="tabler:inbox"
          :class="['text-base shrink-0', activeSlug === 'unorganized' ? 'text-[var(--p-primary-color)]' : 'moh-text']"
          aria-hidden="true"
        />
        <span class="flex-1 truncate">Unorganized</span>
        <Icon v-if="activeSlug === 'unorganized'" name="tabler:check" class="text-xs shrink-0" aria-hidden="true" />
      </button>
      <template v-for="c in collections" :key="c.id">
        <button
          type="button"
          class="w-full text-left px-3 py-2.5 text-sm font-semibold transition-colors moh-text hover:moh-surface-hover flex items-center gap-2"
          role="menuitem"
          @click="goTo(c.slug)"
        >
          <Icon
            :name="c.bookmarkCount > 0 ? 'tabler:folder' : 'tabler:folder-open'"
            :class="[
              'text-base shrink-0',
              activeSlug === c.slug ? 'text-[var(--p-primary-color)]' : 'moh-text',
            ]"
            aria-hidden="true"
          />
          <span class="flex-1 truncate">{{ c.name }}</span>
          <Icon v-if="activeSlug === c.slug" name="tabler:check" class="text-xs shrink-0" aria-hidden="true" />
        </button>
      </template>
      <div class="border-t moh-border px-2 py-1">
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-text hover:moh-surface-hover flex items-center gap-2 rounded-lg"
          role="menuitem"
          @click="onNewFolder"
        >
          <Icon name="tabler:plus" class="text-sm shrink-0" aria-hidden="true" />
          <span>New folder</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookmarkCollection } from '~/types/api'

const props = defineProps<{
  collections: BookmarkCollection[]
  activeSlug: string | null
  unorganizedCount: number
}>()

const emit = defineEmits<{
  (e: 'new-folder'): void
}>()

const open = ref(false)
const wrapEl = ref<HTMLElement | null>(null)

const folderLabel = computed(() => {
  if (props.activeSlug === null) return 'All'
  if (props.activeSlug === 'unorganized') return 'Unorganized'
  const c = props.collections.find((x) => x.slug === props.activeSlug)
  return c?.name ?? props.activeSlug
})

function goTo(slug: string) {
  open.value = false
  void navigateTo(slug ? `/bookmarks/${encodeURIComponent(slug)}` : '/bookmarks')
}

function onNewFolder() {
  open.value = false
  emit('new-folder')
}

watch(
  open,
  (isOpen) => {
    if (!import.meta.client || !isOpen) return
    const onPointerDown = (e: Event) => {
      const el = wrapEl.value
      const target = e.target as Node | null
      if (!el || !target || el.contains(target)) return
      open.value = false
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') open.value = false
    }
    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('touchstart', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  },
  { flush: 'post' },
)
</script>
