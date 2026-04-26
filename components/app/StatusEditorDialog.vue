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
              @submit.prevent="emit('save')"
              @click.stop
            >
              <div>
                <div :id="titleId" class="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  <Icon
                    :name="activeStatus ? 'tabler:message-circle-filled' : 'tabler:message-circle'"
                    class="text-[0.95em] text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                  />
                  <span>{{ activeStatus ? 'Update status' : 'Set status' }}</span>
                </div>
                <p class="mt-1 text-sm leading-snug text-gray-500 dark:text-gray-400">
                  Shows on your avatar for 24 hours.
                </p>
              </div>
              <textarea
                ref="textareaRef"
                :value="draft"
                rows="3"
                maxlength="120"
                placeholder="What are you up to?"
                class="mt-4 min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base leading-6 text-gray-900 outline-none transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--p-primary-color)]/30 dark:border-white/10 dark:bg-[color:var(--moh-surface-1)] dark:text-gray-50 dark:placeholder:text-gray-500"
                @input="onInput"
              ></textarea>
              <div v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</div>
              <div class="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  class="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-black/5 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/5"
                  :disabled="saving || !activeStatus"
                  @click="emit('clear')"
                >
                  Clear
                </button>
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
                    :disabled="saving || !draft.trim()"
                  >
                    {{ saving ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </div>
            </form>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  draft: string
  activeStatus: boolean
  saving: boolean
  error: string | null
  titleId: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:draft', value: string): void
  (e: 'save'): void
  (e: 'clear'): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
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
</script>
