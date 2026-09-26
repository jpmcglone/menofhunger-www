<template>
  <div class="pointer-events-none absolute inset-0">
    <NuxtLink
      v-for="(a, i) in avatars"
      :key="a.user.id"
      :to="a.user.username ? `/u/${a.user.username}` : undefined"
      :aria-label="a.user.name || a.user.username || 'Member'"
      class="moh-map-avatar pointer-events-auto absolute rounded-full"
      :class="a.online ? 'ring-2 ring-[var(--moh-online)] ring-offset-1 ring-offset-[var(--moh-bg)]' : ''"
      :style="{
        left: `${a.x - a.size / 2}px`,
        top: `${a.y - a.size / 2}px`,
        width: `${a.size}px`,
        height: `${a.size}px`,
        animationDelay: `${Math.min(i, 40) * 12}ms`,
      }"
    >
      <AppUserAvatar :user="a.user" size-class="h-full w-full" :show-presence="false" :show-status="false" />
    </NuxtLink>

    <button
      v-if="overflow"
      type="button"
      class="pointer-events-auto absolute -translate-x-1/2 rounded-full border moh-border bg-[var(--moh-surface-2)] px-3 py-1 text-xs font-semibold moh-text shadow-sm transition-colors hover:bg-[var(--moh-surface-hover)]"
      :style="{ left: `${overflow.x}px`, top: `${overflow.y}px` }"
      @click="emit('showAll')"
    >
      +{{ overflow.count }} more
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MembersMapUser } from '~/types/api'

export type PackedAvatar = { user: MembersMapUser; x: number; y: number; size: number; online: boolean }

defineProps<{
  avatars: PackedAvatar[]
  overflow: { x: number; y: number; count: number } | null
}>()

const emit = defineEmits<{ (e: 'showAll'): void }>()
</script>

<style scoped>
.moh-map-avatar {
  animation: moh-map-avatar-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  transition: transform 120ms ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.moh-map-avatar:hover,
.moh-map-avatar:focus-visible {
  z-index: 2;
  transform: scale(1.12);
}

@keyframes moh-map-avatar-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .moh-map-avatar {
    animation: none;
  }
}
</style>
