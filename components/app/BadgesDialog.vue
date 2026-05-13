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
          class="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          role="presentation"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition-[opacity,transform] duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-2 sm:scale-95"
          >
            <section
              class="relative w-full max-w-md rounded-t-3xl bg-white text-left shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:rounded-3xl dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15"
              :style="{ paddingBottom: `calc(var(--moh-safe-bottom, 0px) + 0px)` }"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              @click.stop
            >
              <header class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div class="min-w-0">
                  <h2 :id="titleId" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                    Badges
                  </h2>
                  <p class="mt-0.5 text-xs moh-text-muted">
                    {{ subtitleText }}
                  </p>
                </div>
                <button
                  type="button"
                  class="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  aria-label="Close"
                  @click="close"
                >
                  <Icon name="tabler:x" aria-hidden="true" />
                </button>
              </header>

              <div class="grid grid-cols-3 gap-x-2 gap-y-5 px-5 pb-7 pt-3">
                <AppBadgeTile
                  v-for="badge in BADGES"
                  :key="badge.id"
                  :badge="badge"
                  :longest-streak-days="longestStreakDays"
                />
              </div>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { BADGES, getEarnedBadges } from '~/config/milestones'

const props = defineProps<{
  open: boolean
  longestStreakDays: number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const titleId = `moh-badges-${useId()}`

const earnedCount = computed(() => getEarnedBadges(props.longestStreakDays).length)
const subtitleText = computed(() => `Earned ${earnedCount.value} of ${BADGES.length} — through consistency.`)

function close() {
  emit('update:open', false)
}

useModalEscape(toRef(props, 'open'), close)

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    const root = document.documentElement
    if (open) root.style.overflow = 'hidden'
    else root.style.overflow = ''
  },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = ''
})
</script>
