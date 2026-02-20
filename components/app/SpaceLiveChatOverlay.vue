<template>
  <Teleport to="body">
    <section
      v-if="visible"
      class="fixed inset-0 z-[9999] flex flex-col moh-bg moh-text"
      style="z-index: 9999;"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <!-- Dedicated background layer (texture + vignette) behind content. -->
      <div class="absolute inset-0 moh-bg moh-texture moh-vignette pointer-events-none" aria-hidden="true" />

      <header
        class="relative z-10 shrink-0 border-b moh-border-subtle px-4 pb-3 pt-[calc(1rem+var(--moh-safe-top,0px))] flex items-center justify-between gap-3"
      >
        <div class="min-w-0">
          <h2 :id="titleId" class="truncate text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Live chat
          </h2>
          <div class="mt-0.5 text-xs text-gray-600 dark:text-gray-300 truncate">
            {{ spaceName }}
          </div>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <span class="text-[11px] font-semibold rounded-full border moh-border px-2 py-1 text-gray-600 dark:text-gray-300">
            Not saved
          </span>
          <span class="tabular-nums text-gray-500 dark:text-gray-400 text-xs">
            {{ messageCount }}
          </span>
          <button
            type="button"
            class="moh-tap ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-50"
            aria-label="Close"
            @click="close"
          >
            <Icon name="tabler:x" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="relative z-10 flex-1 min-h-0 pb-[calc(var(--moh-safe-bottom,0px))]">
        <AppRadioLiveChatPanel class="h-full min-h-0 !border-0 !rounded-none" :show-header="false" />
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  spaceName: string
  messageCount: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed(() => props.modelValue)
const titleId = `moh-live-chat-${useId?.() ?? Math.random().toString(16).slice(2)}`
const previousOverflow = ref<string>('')

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) close()
}

watch(
  () => visible.value,
  (v) => {
    if (!import.meta.client) return
    const el = document.documentElement
    if (v) {
      previousOverflow.value = el.style.overflow
      el.style.overflow = 'hidden'
    } else {
      el.style.overflow = previousOverflow.value
      previousOverflow.value = ''
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  if (!import.meta.client) return
  // Safety: if the overlay is destroyed while open (e.g., leaving a space), restore scroll.
  const el = document.documentElement
  el.style.overflow = previousOverflow.value
  previousOverflow.value = ''
})
</script>

