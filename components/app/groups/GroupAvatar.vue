<template>
  <span class="inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--moh-surface-2)] font-semibold moh-text" :class="groupAvatarRoundClass()" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * .34}px` }" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" class="h-full w-full object-cover" loading="lazy" @error="failed = true">
    <span v-else>{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'
const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: number }>(), { size: 36, src: null })
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : (parts[0]?.slice(0, 2) ?? '?')).toUpperCase()
})
</script>
