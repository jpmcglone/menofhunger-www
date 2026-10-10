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
          <component
            :is="shortcutRoute(shortcut) ? NuxtLink : 'button'"
            v-for="shortcut in section.shortcuts"
            :key="shortcut.action"
            :to="shortcutRoute(shortcut)"
            :type="shortcutRoute(shortcut) ? undefined : 'button'"
            class="moh-focus flex min-h-11 w-full items-center justify-between gap-4 rounded-lg px-2 py-2 text-left moh-surface-hover"
            @click="activate(shortcut)"
          >
            <span class="text-sm moh-text">{{ shortcut.label }}</span>
            <div class="flex shrink-0 items-center gap-1">
              <template v-for="(key, i) in displayKeys(shortcut)" :key="key">
                <span
                  v-if="i > 0 && shortcut.keyMode === 'chord'"
                  class="text-xs moh-text-muted"
                >
                  +
                </span>
                <kbd class="inline-flex items-center justify-center rounded border moh-border bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs font-semibold moh-text shadow-[0_1px_0_0_var(--moh-border-color,theme(colors.gray.300))] dark:shadow-[0_1px_0_0_var(--moh-border-color,theme(colors.zinc.600))] min-w-[1.75rem] text-center">
                  {{ key }}
                </kbd>
                <span
                  v-if="shortcut.keyMode === 'sequence' && i < shortcut.keys.length - 1"
                  class="text-xs moh-text-muted select-none"
                >
                  then
                </span>
              </template>
            </div>
          </component>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type { ShortcutSection, ShortcutDef } from '~/composables/useKeyboardShortcuts'
import { ALL_SHORTCUTS } from '~/composables/useKeyboardShortcuts'
import { MOH_SHORTCUT_ACTIONS_KEY, type ShortcutMediaActions } from '~/utils/keyboard-shortcuts'

const props = defineProps<ShortcutMediaActions>()
const { showModal } = useKeyboardShortcuts()
const actions = inject(MOH_SHORTCUT_ACTIONS_KEY)
// A deterministic initial value keeps server and first-client markup aligned.
const isMac = ref(false)
onMounted(() => { isMac.value = /Mac|iPhone|iPad|iPod/.test(navigator.platform) })

function displayKeys(shortcut: ShortcutDef): string[] {
  return shortcut.action === 'theme' ? [isMac.value ? '⌘' : 'Ctrl', 'Shift', '.'] : shortcut.keys
}

function shortcutRoute(shortcut: ShortcutDef) {
  return actions?.routeFor(shortcut.action)
}

async function activate(shortcut: ShortcutDef) {
  // Navigation stays with NuxtLink, including modified clicks and context menus.
  if (shortcutRoute(shortcut)) {
    showModal.value = false
    return
  }
  // Toggling the already-open help modal is itself a dismissal.
  if (shortcut.action === 'shortcuts') actions?.execute(shortcut.action, props)
  showModal.value = false
  // Let the modal disappear before transferring focus or opening another overlay.
  await nextTick()
  if (shortcut.action !== 'shortcuts') actions?.execute(shortcut.action, props)
}

const SECTION_ORDER: ShortcutSection[] = ['Navigation', 'Feed', 'Media', 'Help']

const sections = computed(() =>
  SECTION_ORDER.map((name) => ({
    name,
    shortcuts: ALL_SHORTCUTS.filter((s) => s.section === name),
  })).filter((s) => s.shortcuts.length > 0),
)
</script>
