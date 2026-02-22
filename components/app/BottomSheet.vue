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
        class="fixed inset-0 flex flex-col justify-end"
        style="z-index: 10000; isolation: isolate;"
        role="presentation"
      >
        <!-- Backdrop: covers app; tap to close -->
        <div
          class="absolute inset-0 bg-black/40"
          aria-hidden="true"
          @click="onMaskClick"
        />

        <!-- Panel: anchored to bottom of this overlay (on top of backdrop by DOM order) -->
        <section
            :class="[
              'relative z-[1] mx-auto w-full flex flex-col',
              panelClass ??
                (fullScreen
                  ? 'min-h-0 flex-1 max-w-none rounded-none shadow-none moh-bg moh-text moh-texture'
                  : 'max-w-[36rem] rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-950'),
            ]"
            :style="{
              paddingBottom: `calc(var(--moh-safe-bottom, 0px) + 0.75rem)`,
            }"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
          >
        <header
          :class="[
            'flex items-center justify-between gap-3',
            fullScreen ? 'px-4 pb-3 pt-[calc(1rem+var(--moh-safe-top,0px))] border-b moh-border-subtle' : 'px-5 pt-4',
          ]"
        >
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
            <Icon name="tabler:x" aria-hidden="true" />
          </button>
        </header>

        <div
          :class="[
            contentClass ??
              (fullScreen ? 'flex flex-col flex-1 min-h-0 overflow-hidden px-0 pb-0 pt-0' : 'px-5 pb-4 pt-3'),
          ]"
        >
          <slot />
        </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    dismissableMask?: boolean
    fullScreen?: boolean
    panelClass?: string
    contentClass?: string
  }>(),
  {
    dismissableMask: true,
    fullScreen: false,
    panelClass: undefined,
    contentClass: undefined,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed(() => props.modelValue)
const fullScreen = computed(() => props.fullScreen)
const panelClass = computed(() => (props.panelClass ?? '').trim() || null)
const contentClass = computed(() => (props.contentClass ?? '').trim() || null)
const titleId = `moh-sheet-${useId()}`

// Use opacity-only transitions so the panel is never off-screen (translate-y-full was
// getting stuck on some mobile browsers and only the dim showed).
const panelEnterActiveClass = computed(() => 'transition-opacity duration-200 ease-out')
const panelEnterFromClass = computed(() => 'opacity-0')
const panelEnterToClass = computed(() => 'opacity-100')
const panelLeaveActiveClass = computed(() => 'transition-opacity duration-150 ease-in')
const panelLeaveFromClass = computed(() => 'opacity-100')
const panelLeaveToClass = computed(() => 'opacity-0')

function close() {
  emit('update:modelValue', false)
}

function onMaskClick() {
  if (!props.dismissableMask) return
  close()
}

useModalEscape(visible, close)

watch(
  () => visible.value,
  (v) => {
    // Prevent background scroll while open
    const el = document.documentElement
    if (v) el.style.overflow = 'hidden'
    else el.style.overflow = ''
  }
)
</script>

