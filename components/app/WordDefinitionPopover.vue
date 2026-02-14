<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && payload"
        ref="cardEl"
        class="fixed z-[1300] w-[420px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border moh-border moh-popover moh-card-matte transition-[left,top] duration-150 ease-out motion-reduce:transition-none will-change-[left,top]"
        :style="posStyle"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
      >
        <div class="flex items-start justify-between gap-4 border-b moh-border px-4 py-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold moh-text">
              {{ payload.word }}
            </div>
            <div class="mt-0.5 text-xs moh-text-muted">Webster’s 1828 Dictionary</div>
          </div>
          <button
            class="shrink-0 rounded-lg px-2 py-1 text-xs moh-text-muted hover:moh-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--moh-text)_30%,transparent)]"
            type="button"
            aria-label="Close"
            @click="close"
          >
            Esc
          </button>
        </div>

        <div class="max-h-[320px] overflow-y-auto px-4 py-3">
          <div v-if="!hasDefinition" class="text-sm moh-text-muted">
            Definition unavailable right now.
          </div>
          <div
            v-else-if="definitionHtml"
            class="moh-wotd-definition text-[0.93rem] leading-relaxed moh-text"
            v-html="definitionHtml"
          />
          <div v-else class="space-y-3 text-[0.93rem] leading-relaxed moh-text">
            <p v-for="(p, idx) in paragraphs" :key="idx" class="whitespace-pre-wrap">
              {{ p }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end border-t moh-border px-4 py-2">
          <a
            class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium moh-text-muted hover:moh-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--moh-text)_30%,transparent)]"
            :href="payload.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source in a new tab"
            title="Open source in a new tab"
          >
            <span>Source</span>
            <Icon name="tabler:external-link" class="text-[12px]" aria-hidden="true" />
          </a>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const pop = useWordDefinitionPopover()
const { state } = pop

const open = computed(() => Boolean(state.value.open))
const payload = computed(() => state.value.payload)
const definitionHtml = computed(() => {
  const html = payload.value?.definitionHtml ?? null
  return html && html.trim() ? html : null
})
const hasDefinition = computed(() => Boolean(definitionHtml.value || paragraphs.value.length))

const paragraphs = computed(() => {
  const def = payload.value?.definition ?? null
  if (!def) return []
  return def
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter(Boolean)
})

const cardEl = ref<HTMLElement | null>(null)
const { style: posStyle } = useAnchoredPopoverPosition({
  open,
  anchorX: computed(() => state.value.anchorX),
  anchorY: computed(() => state.value.anchorY),
  el: cardEl,
  defaultWidth: 420,
  defaultHeight: 240,
  margin: 8,
  offset: 8,
})

function close() {
  pop.close()
}

function onCardEnter() {
  pop.onCardEnter()
}
function onCardLeave() {
  pop.onCardLeave()
}

onMounted(() => {
  const onPointerDown = (e: PointerEvent) => {
    // If a delayed preview is pending, cancel it so it can't show after a click+navigate.
    pop.cancelPending()
    if (!state.value.open) return
    const el = cardEl.value
    if (!el) return
    if (e.target instanceof Node && el.contains(e.target)) return
    pop.close()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (!state.value.open) return
    if (e.key === 'Escape') pop.close()
  }

  document.addEventListener('pointerdown', onPointerDown, { capture: true })
  window.addEventListener('keydown', onKeyDown)
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('keydown', onKeyDown)
  })
})
</script>

<style scoped>
.moh-wotd-definition :deep(p) {
  margin: 0 0 0.95rem 0;
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

