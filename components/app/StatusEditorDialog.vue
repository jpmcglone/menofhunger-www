<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-[opacity,transform] duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-95"
          >
            <form
              class="w-full max-w-sm rounded-3xl bg-white p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              @submit.prevent="onSubmit"
              @click.stop
            >
              <!-- Header -->
              <div>
                <div :id="titleId" class="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  <Icon
                    :name="activeStatus ? 'tabler:message-circle-filled' : 'tabler:message-circle'"
                    class="text-[0.95em] text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                  />
                  <span>{{ dialogTitle }}</span>
                </div>
                <p v-if="activeStatus && !isReplacing" class="mt-1 text-sm leading-snug text-gray-500 dark:text-gray-400">
                  Keeps current expiry.
                  <button
                    type="button"
                    class="ml-1 font-medium text-[var(--p-primary-color)] hover:underline"
                    @click="isReplacing = true"
                  >
                    Replace instead
                  </button>
                </p>
              </div>

              <!-- Textarea -->
              <textarea
                ref="textareaRef"
                :value="draft"
                rows="3"
                maxlength="120"
                placeholder="What are you up to?"
                class="mt-4 min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base leading-6 text-gray-900 outline-none transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--p-primary-color)]/30 dark:border-white/10 dark:bg-[color:var(--moh-surface-1)] dark:text-gray-50 dark:placeholder:text-gray-500"
                @input="onInput"
              ></textarea>

              <!-- Duration chips + post toggle — only for new or replace -->
              <template v-if="!activeStatus || isReplacing">
                <!-- Duration chips -->
                <div class="mt-4">
                  <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Duration
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="h in DURATION_OPTIONS"
                      :key="h"
                      type="button"
                      class="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
                      :class="selectedDuration === h
                        ? 'border-[var(--p-primary-color)] bg-[var(--p-primary-color)] text-white'
                        : 'border-black/10 text-gray-700 hover:border-black/20 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/25'"
                      @click="selectedDuration = h"
                    >
                      {{ durationLabel(h) }}
                    </button>
                  </div>
                </div>

                <!-- Post to feed toggle -->
                <label class="mt-4 flex cursor-pointer items-center gap-3">
                  <span
                    class="flex-1 text-sm font-medium transition-colors"
                    :class="createsPost ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'"
                  >
                    Post to feed
                  </span>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="createsPost"
                    class="relative h-6 w-10 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-color)]/40"
                    :class="createsPost ? 'bg-[var(--p-primary-color)]' : 'bg-gray-300 dark:bg-gray-600'"
                    @click="createsPost = !createsPost"
                  >
                    <!-- Track 40x24, knob 20 → 2px inset all round; travel = 40-20-(2*2) = 16px. -->
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="createsPost ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </button>
                </label>
              </template>

              <div v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</div>

              <!-- Actions -->
              <div class="mt-5 flex items-center justify-between gap-3">
                <button
                  v-if="activeStatus"
                  type="button"
                  class="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-black/5 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/5"
                  :disabled="saving"
                  @click="showClearConfirm = true"
                >
                  Clear
                </button>
                <div v-else />
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
                    :disabled="saving"
                    @click="close"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="moh-pressable rounded-xl bg-[var(--p-primary-color)] px-4 py-2 text-sm font-semibold text-white transition-[opacity,transform] active:scale-[0.96] disabled:opacity-60"
                    :disabled="saving || !draft.trim() || (isEditMode && draft.trim() === openedDraft.trim())"
                  >
                    {{ saving ? 'Saving…' : submitLabel }}
                  </button>
                </div>
              </div>
            </form>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>

  <AppConfirmDialog
    :visible="showClearConfirm"
    header="Clear status?"
    message="Your status and its post will be removed."
    confirm-label="Clear"
    confirm-severity="danger"
    @update:visible="showClearConfirm = $event"
    @confirm="emit('clear')"
  />
</template>

<script setup lang="ts">
const DURATION_OPTIONS = [1, 3, 6, 12, 24] as const
type DurationHours = (typeof DURATION_OPTIONS)[number]

const props = defineProps<{
  open: boolean
  draft: string
  /** True when the user already has an active status (switches UI to Update/Replace mode). */
  activeStatus: boolean
  saving: boolean
  error: string | null
  titleId: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:draft', value: string): void
  /**
   * Emitted when creating a new status OR replacing an existing one (PUT).
   * Callers should call `setMyStatus(draft, { durationHours, createsPost })`.
   */
  (e: 'save', opts: { durationHours: DurationHours; createsPost: boolean }): void
  /**
   * Emitted when editing (updating text of) an existing status (PATCH).
   * Callers should call `editMyStatus(draft)`.
   */
  (e: 'edit'): void
  (e: 'clear'): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const selectedDuration = ref<DurationHours>(24)
const createsPost = ref(true)
/** True when user clicked "Replace instead" while editing an active status. */
const isReplacing = ref(false)
const showClearConfirm = ref(false)
/** Snapshot of the draft when the dialog last opened — used to detect unchanged edits. */
const openedDraft = ref('')

const isEditMode = computed(() => props.activeStatus && !isReplacing.value)

const dialogTitle = computed(() => {
  if (!props.activeStatus) return 'Set status'
  if (isReplacing.value) return 'Replace status'
  return 'Update status'
})

const submitLabel = computed(() => {
  if (!props.activeStatus) return 'Set'
  if (isReplacing.value) return 'Replace'
  return 'Update'
})

watch(
  () => props.open,
  (open) => {
    if (!open) {
      isReplacing.value = false
      selectedDuration.value = 24
      createsPost.value = true
      return
    }
    openedDraft.value = props.draft
    void nextTick(() => textareaRef.value?.focus())
  },
)

function close() {
  emit('update:open', false)
}

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  emit('update:draft', target?.value ?? '')
}

function onSubmit() {
  if (isEditMode.value) {
    emit('edit')
  } else {
    emit('save', { durationHours: selectedDuration.value, createsPost: createsPost.value })
  }
}

function durationLabel(h: DurationHours): string {
  if (h < 24) return `${h}h`
  return '24h'
}
</script>
