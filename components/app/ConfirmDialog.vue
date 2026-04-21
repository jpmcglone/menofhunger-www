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
          :aria-label="header"
          @keydown.enter.prevent="!(loading || disabled) && onConfirm()"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/55"
            aria-hidden="true"
            @click="onCancel"
          />

          <!-- Centered panel -->
          <div class="absolute inset-0 flex items-center justify-center p-4">
            <section
              class="relative w-full max-w-md rounded-2xl border moh-border moh-surface-1 moh-texture moh-card-matte overflow-hidden"
              @click.stop
            >
              <!-- Body -->
              <div class="px-5 pt-5 pb-4">
                <h2 class="moh-h2 mb-1">{{ header }}</h2>
                <p class="text-sm moh-text-muted">
                  <slot>{{ message }}</slot>
                </p>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-2 px-5 pb-4">
                <button
                  v-if="showCancel"
                  type="button"
                  class="moh-tap moh-focus rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:moh-text transition-colors"
                  :disabled="loading"
                  @click="onCancel"
                >
                  {{ cancelLabel }}
                </button>
                <slot name="extra-actions" />
                <button
                  ref="confirmBtnRef"
                  type="button"
                  :class="[
                    'moh-tap moh-pressable moh-focus rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5',
                    severityClasses,
                  ]"
                  :disabled="loading || disabled"
                  @click="onConfirm"
                >
                  <Icon v-if="loading" name="tabler:loader-2" size="16" class="animate-spin" aria-hidden="true" />
                  <Icon v-else-if="confirmIcon" :name="confirmIcon" size="16" aria-hidden="true" />
                  {{ confirmLabel }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean
    header: string
    message?: string
    cancelLabel?: string
    showCancel?: boolean
    confirmLabel?: string
    confirmSeverity?: 'danger' | 'primary' | 'secondary' | 'warning' | 'info' | 'success'
    confirmIcon?: string
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    cancelLabel: 'Cancel',
    showCancel: true,
    confirmLabel: 'Confirm',
    confirmSeverity: 'danger',
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
  cancel: []
}>()

const confirmBtnRef = ref<HTMLButtonElement | null>(null)

const open = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

useScrollLock(open)
useModalEscape(open, () => onCancel())

watch(open, (visible) => {
  if (visible) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => confirmBtnRef.value?.focus())
    })
  }
})

const severityClasses = computed(() => {
  switch (props.confirmSeverity) {
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700'
    case 'warning':
      return 'bg-amber-500 text-white hover:bg-amber-600'
    case 'success':
      return 'bg-emerald-600 text-white hover:bg-emerald-700'
    default:
      return 'bg-[var(--moh-text)] text-[var(--moh-bg)] hover:opacity-90'
  }
})

function onConfirm() {
  emit('confirm')
  open.value = false
}

function onCancel() {
  open.value = false
  emit('cancel')
}
</script>
