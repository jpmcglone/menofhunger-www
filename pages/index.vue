<template>
  <div class="w-full flex flex-col items-center justify-center">
    <AppLogo
      :alt="siteConfig.name"
      class="mb-0 rounded-lg"
      :width="400"
      :height="400"
    />

    <!-- Place `public/images/banner.png` (served as /images/banner.png) -->
    <img
      src="/images/banner.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none select-none block w-[min(90vw,520px)] -translate-y-[35px]"
    />
    <p class="mt-0 text-2xl font-medium tracking-wider text-gray-500 dark:text-gray-500">
      <span class="text-gray-800 dark:text-gray-200">Updates coming soon.</span>
    </p>
    <p class="mt-2 text-lg font-light tracking-widest text-gray-400 dark:text-gray-600">
      Stay tuned. Stay hungry.
    </p>
    <div class="mt-6 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"/>

    <!-- Roanoke meetup: subtle "question card" that pops -->
    <div class="mt-10 w-full max-w-xl">
      <div class="cursor-pointer rounded-2xl border border-orange-200/70 bg-orange-50/60 px-4 py-3 shadow-sm backdrop-blur dark:border-orange-500/20 dark:bg-orange-500/10">
        <button
          type="button"
          class="w-full text-left cursor-pointer"
          @click="isRoanokeOpen = true"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-orange-700 ring-1 ring-orange-200/70 dark:bg-zinc-950/40 dark:text-orange-300 dark:ring-orange-500/20">
              <i class="pi pi-map-marker" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Looking for the Roanoke, VA meetup?
              </div>
              <div class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                Tap to open details + the Meetup link.
              </div>
            </div>
            <div class="text-orange-700 dark:text-orange-300">
              <i class="pi pi-angle-right" aria-hidden="true" />
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Custom bottom sheet (avoids clipping issues on some browsers). -->
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
          v-if="isRoanokeOpen"
          class="fixed inset-0 z-[100] bg-black/50"
          role="presentation"
          @click="isRoanokeOpen = false"
        />
      </Transition>

      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="isRoanokeOpen"
          class="fixed inset-x-0 bottom-0 z-[101] flex justify-center px-3 pb-[env(safe-area-inset-bottom)]"
          role="dialog"
          aria-modal="true"
          aria-label="Roanoke meetup"
          @click="isRoanokeOpen = false"
        >
          <div
            class="w-full max-w-xl rounded-t-2xl border border-orange-200/70 bg-orange-50/60 shadow-2xl backdrop-blur dark:border-orange-500/20 dark:bg-orange-500/10"
            @click.stop
          >
            <div class="flex items-center justify-between px-5 py-4">
              <div class="flex items-center gap-3">
                <AppLogo
                  alt="Men of Hunger"
                  :light-src="logoDark"
                  :dark-src="logoDark"
                  :width="40"
                  :height="40"
                  img-class="h-10 w-10 rounded"
                />
                <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">Men of Hunger: Roanoke</div>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-950/40 dark:hover:text-gray-50"
                aria-label="Close"
                @click="isRoanokeOpen = false"
              >
                <i class="pi pi-times" aria-hidden="true" />
              </button>
            </div>

            <div class="px-5 pb-6 max-h-[75vh] overflow-y-auto">
              <div class="space-y-4 pb-2">
                <div class="space-y-2">
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Men of Hunger is a men’s group for ambitious builders, leaders, and growth-minded men who refuse to drift.
                    We meet to think clearly, speak honestly, and help one another move our missions forward.
                  </p>
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Events range from open discussions (like <span class="font-medium">Estuary</span>) to learning sessions, service projects, and accountability groups.
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <a :href="roanokeMeetupUrl" target="_blank" rel="noopener noreferrer" class="inline-flex w-full">
                    <Button label="Open on meetup.com" icon="pi pi-external-link" icon-pos="right" class="w-full rounded-full" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { siteConfig } from '~/config/site'
import logoDark from '~/assets/images/logo-black-bg.png'

definePageMeta({
  layout: 'empty'
})

useHead({
  htmlAttrs: {
    class: 'moh-landing'
  }
})

const roanokeMeetupUrl = 'https://www.meetup.com/menofhunger/'
const isRoanokeOpen = ref(false)

watch(isRoanokeOpen, (open) => {
  // Prevent background scrolling while the sheet is open.
  if (import.meta.client) {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})

usePageSeo({
  title: siteConfig.meta.title,
  description:
    'Men of Hunger is a brotherhood for ambitious builders and growth-minded men. Updates coming soon — stay tuned. Stay hungry.',
  canonicalPath: '/'
})
</script>
