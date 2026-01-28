<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90 sm:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Primary"
  >
    <div class="mx-auto w-full max-w-6xl px-2">
      <div class="grid grid-flow-col auto-cols-fr py-2">
        <NuxtLink
          v-for="item in items"
          :key="item.key"
          :to="item.to"
          class="flex flex-col items-center justify-center py-1"
          :class="isActive(item.to) ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'"
        >
          <div class="h-8 w-8 flex items-center justify-center">
            <div
              v-if="item.key === 'profile'"
              class="h-7 w-7 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
              aria-label="Profile"
            >
              <img
                v-if="meAvatarUrl"
                :src="meAvatarUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              >
              <div v-else class="h-full w-full" aria-hidden="true" />
            </div>
            <i v-else class="pi text-xl" :class="item.icon" aria-hidden="true" />
          </div>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { AppNavItem } from '~/composables/useAppNav'

defineProps<{
  items: AppNavItem[]
}>()

const route = useRoute()
const { user } = useAuth()
const { assetUrl } = useAssets()

const meAvatarUrl = computed(() => {
  const base = assetUrl(user.value?.avatarKey)
  if (!base) return null
  const v = user.value?.avatarUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
})

function isActive(to: string) {
  if (to === '/home') return route.path === '/home'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

