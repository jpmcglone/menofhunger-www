<template>
  <ClientOnly>
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
          v-if="open"
          class="fixed inset-0 z-[1200]"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/55"
            aria-hidden="true"
            @click="onMaskClick"
          />

          <!-- Centered panel -->
          <div class="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <section
              :class="[
                'relative w-full overflow-hidden rounded-2xl border bg-white shadow-2xl moh-card-matte dark:bg-black dark:border-zinc-800',
                maxWidthClass,
              ]"
              :style="panelStyle"
              @click.stop
            >
              <header class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
                <div class="min-w-0">
                  <div class="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {{ title }}
                  </div>
                </div>
                <button
                  v-if="showClose"
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-gray-50 disabled:opacity-50"
                  aria-label="Close"
                  :disabled="disableClose"
                  @click="close"
                >
                  <i class="pi pi-times" aria-hidden="true" />
                </button>
              </header>

              <!-- Scrollable body -->
              <div :class="['overflow-y-auto overflow-x-hidden', bodyClass]" :style="bodyStyle">
                <slot />
              </div>

              <footer
                v-if="$slots.footer"
                class="px-4 py-3 border-t border-gray-200 dark:border-zinc-800"
              >
                <slot name="footer" />
              </footer>
            </section>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    /** Max width Tailwind class for the panel (default matches follow list dialog sizing). */
    maxWidthClass?: string
    /** When false, clicking the backdrop does nothing. */
    dismissableMask?: boolean
    /** When false, hide the close (X) button. */
    showClose?: boolean
    /** When true, disable closing (esc, mask, button). */
    disableClose?: boolean
    /** Optional extra classes for scrollable body. */
    bodyClass?: string
    /** Optional explicit max height override (CSS value). */
    maxHeight?: string
  }>(),
  {
    maxWidthClass: 'max-w-[38rem]',
    dismissableMask: true,
    showClose: true,
    disableClose: false,
    bodyClass: 'p-0',
    maxHeight: 'min(90vh, 40rem)',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const open = computed(() => Boolean(props.modelValue))
useScrollLock(open)

function close() {
  if (props.disableClose) return
  emit('update:modelValue', false)
}

function onMaskClick() {
  if (!props.dismissableMask) return
  close()
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

const panelStyle = computed<CSSProperties>(() => ({
  maxHeight: props.maxHeight,
}))
const bodyStyle = computed<CSSProperties>(() => ({
  maxHeight: `calc(${props.maxHeight} - 3.25rem${hasFooter.value ? ' - 3.25rem' : ''})`,
}))

const hasFooter = computed(() => Boolean(useSlots().footer))
</script>

