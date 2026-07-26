<template>
  <!-- Read-only status speech-bubble chip — matches the profile header status pill. -->
  <div
    :class="[
      'inline-flex max-w-full items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-semibold leading-snug text-zinc-950 shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-1 ring-black/5',
      isMultiline ? 'rounded-xl' : 'rounded-full',
    ]"
  >
    <Icon name="tabler:message-circle-filled" class="shrink-0 text-[13px] text-zinc-950" aria-hidden="true" />
    <span ref="textEl" class="moh-clamp-2 min-w-0 text-left">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
}>()

const textEl = ref<HTMLElement | null>(null)
const { isMultiline } = useIsMultiline(textEl)
</script>
