<template>
  <Transition
    enter-active-class="transition-[opacity,transform] duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-[opacity,transform] duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(var(--moh-safe-bottom,0px)+0.75rem)] pt-3"
      role="banner"
    >
      <div class="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border moh-border moh-surface shadow-[0_8px_32px_rgba(0,0,0,0.18)] px-4 py-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold moh-text leading-snug">Men of Hunger</p>
          <p class="text-xs moh-text-muted mt-0.5 leading-snug">A trusted community for men. Accountability, no noise.</p>
        </div>
        <Button
          as="NuxtLink"
          :to="`/login?redirect=${encodeURIComponent(currentPath)}`"
          label="Join free"
          rounded
          size="small"
          class="shrink-0"
        />
        <button
          type="button"
          class="shrink-0 -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <Icon name="tabler:x" size="16" aria-hidden="true" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const route = useRoute()
const { isAuthed } = useAuth()

const dismissed = useState<boolean>('join-banner-dismissed', () => false)
const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
})

const currentPath = computed(() => route.fullPath)
const visible = computed(() => hydrated.value && !isAuthed.value && !dismissed.value)

function dismiss() {
  dismissed.value = true
}
</script>
