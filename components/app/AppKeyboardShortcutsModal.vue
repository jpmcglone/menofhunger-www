<template>
  <AppModal
    v-model="showModal"
    title="Keyboard shortcuts"
    max-width-class="max-w-[42rem]"
    max-height="min(90vh, 38rem)"
    body-class="p-0"
  >
    <div class="px-5 py-4 space-y-6">
      <div
        v-for="section in sections"
        :key="section.name"
      >
        <h3 class="mb-2 text-xs font-bold uppercase tracking-widest moh-text-muted">
          {{ section.name }}
        </h3>
        <div class="space-y-0.5">
          <div
            v-for="shortcut in section.shortcuts"
            :key="shortcut.label"
            class="flex items-center justify-between gap-4 rounded-lg px-2 py-2 moh-surface-hover"
          >
            <span class="text-sm moh-text">{{ shortcut.label }}</span>
            <div class="flex shrink-0 items-center gap-1">
              <template v-for="(key, i) in shortcut.keys" :key="key">
                <span
                  v-if="i > 0 && shortcut.keys.length > 1 && !isSequence(shortcut)"
                  class="text-xs moh-text-muted"
                >
                  /
                </span>
                <kbd class="inline-flex items-center justify-center rounded border moh-border bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs font-semibold moh-text shadow-[0_1px_0_0_var(--moh-border-color,theme(colors.gray.300))] dark:shadow-[0_1px_0_0_var(--moh-border-color,theme(colors.zinc.600))] min-w-[1.75rem] text-center">
                  {{ key }}
                </kbd>
                <span
                  v-if="isSequence(shortcut) && i < shortcut.keys.length - 1"
                  class="text-xs moh-text-muted select-none"
                >
                  then
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { ShortcutSection } from '~/composables/useKeyboardShortcuts'
import { ALL_SHORTCUTS } from '~/composables/useKeyboardShortcuts'
import type { ShortcutDef } from '~/composables/useKeyboardShortcuts'

const { showModal } = useKeyboardShortcuts()

/**
 * A shortcut with multiple keys is a "sequence" (G then H) when all keys
 * are single characters — as opposed to alternatives like '←' / '→'.
 */
function isSequence(shortcut: ShortcutDef): boolean {
  if (shortcut.keys.length <= 1) return false
  return shortcut.keys.every((k) => k.length === 1)
}

const SECTION_ORDER: ShortcutSection[] = ['Navigation', 'Feed', 'Media', 'Help']

const sections = computed(() =>
  SECTION_ORDER.map((name) => ({
    name,
    shortcuts: ALL_SHORTCUTS.filter((s) => s.section === name),
  })).filter((s) => s.shortcuts.length > 0),
)
</script>
