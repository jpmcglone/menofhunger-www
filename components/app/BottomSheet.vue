<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[1000] bg-black/40"
        aria-hidden="true"
        @click="onMaskClick"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-250 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <section
        v-if="visible"
        class="fixed inset-x-0 bottom-0 z-[1001] mx-auto w-full max-w-[36rem] rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :style="{ paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem)` }"
      >
        <header class="flex items-center justify-between gap-3 px-5 pt-4">
          <div class="min-w-0">
            <h2 :id="titleId" class="truncate text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
              {{ title }}
            </h2>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
            aria-label="Close"
            @click="close"
          >
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <div class="px-5 pb-4 pt-3">
          <slot />
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    dismissableMask?: boolean
  }>(),
  {
    dismissableMask: true
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed(() => props.modelValue)
const titleId = `moh-sheet-${useId?.() ?? Math.random().toString(16).slice(2)}`

function close() {
  emit('update:modelValue', false)
}

function onMaskClick() {
  if (!props.dismissableMask) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) close()
}

watch(
  () => visible.value,
  (v) => {
    // Prevent background scroll while open
    const el = document.documentElement
    if (v) el.style.overflow = 'hidden'
    else el.style.overflow = ''
  }
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

