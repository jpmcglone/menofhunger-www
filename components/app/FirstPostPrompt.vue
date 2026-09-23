<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="open"
          class="pointer-events-none fixed bottom-[calc(var(--moh-tabbar-height,4rem)+var(--moh-safe-bottom,0px))] z-[80] px-3 pb-3 md:bottom-0 md:px-4 md:pb-4"
          :style="alignStyle"
          role="presentation"
        >
          <section
            class="pointer-events-auto relative grid w-full gap-x-5 gap-y-3 rounded-xl border moh-border bg-[var(--moh-surface-2)] p-4 text-left shadow-lg sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:pr-14"
            role="region"
            :aria-labelledby="titleId"
            @keydown.esc.stop="emit('dismiss')"
          >
            <div class="flex min-w-0 items-start gap-3 pr-9 sm:pr-0">
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style="background-color: color-mix(in srgb, var(--moh-verified) 14%, transparent); color: var(--moh-verified)"
                aria-hidden="true"
              >
                <AppIconGlyph name="badgeVerified" class="h-[22px] w-[22px]" />
              </span>
              <div class="min-w-0" role="status" aria-live="polite">
                <h2 :id="titleId" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  You’re verified.
                </h2>
                <p class="mt-0.5 text-xs moh-text-muted text-pretty">
                  Say hello. We started your first post for you.
                </p>
                <p class="mt-2 inline-block max-w-full truncate rounded-lg moh-surface-1 px-2.5 py-1.5 text-[13px] moh-text-soft">
                  “{{ starter.trim() }}…”
                </p>
              </div>
            </div>

            <button
              type="button"
              class="flex min-h-11 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-opacity active:opacity-75 dark:bg-white dark:text-gray-900"
              @click="emit('start')"
            >
              Finish my post
            </button>

            <button
              type="button"
              class="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
              aria-label="Not now"
              @click="emit('dismiss')"
            >
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  starter: string
  /** Center-column `left` / `width` from the app layout. */
  alignStyle?: Record<string, string>
}>()

const emit = defineEmits<{
  start: []
  dismiss: []
}>()

const titleId = `moh-first-post-${useId()}`
</script>
