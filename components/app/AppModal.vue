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
                'relative flex w-full flex-col overflow-hidden rounded-2xl border moh-border moh-surface-1 moh-texture moh-card-matte',
                maxWidthClass,
              ]"
              :style="panelStyle"
              @click.stop
            >
              <header class="flex items-center justify-between gap-3 moh-gutter-x py-3 border-b moh-border">
                <div class="min-w-0">
                  <div class="truncate moh-h2">
                    {{ title }}
                  </div>
                </div>
                <button
                  v-if="showClose"
                  type="button"
                  class="moh-tap moh-focus inline-flex h-9 w-9 items-center justify-center rounded-full moh-text-muted hover:moh-text moh-surface-hover disabled:opacity-50"
                  aria-label="Close"
                  :disabled="disableClose"
                  @click="close"
                >
                  <Icon name="tabler:x" aria-hidden="true" />
                </button>
              </header>

              <!-- Scrollable body -->
              <div :class="['min-h-0 flex-1 overflow-y-auto overflow-x-hidden', bodyClass]">
                <slot />
              </div>

              <footer
                v-if="$slots.footer"
                class="moh-gutter-x border-t moh-border pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
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
import { useEventListener } from '@vueuse/core'
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

useEventListener(window, 'keydown', onKeyDown)

const panelStyle = computed<CSSProperties>(() => ({
  maxHeight: props.maxHeight,
}))
</script>

