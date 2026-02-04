<template>
  <div
    v-if="visible"
    class="pointer-events-none absolute z-20 rounded-2xl -inset-x-2 -top-2"
    :class="tightBottom ? '-bottom-1' : '-bottom-2'"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0 rounded-2xl border-2 border-dashed opacity-70"
      :style="{ borderColor: accentBorderColor }"
    />
    <div class="absolute inset-0 rounded-2xl bg-black/10 dark:bg-white/5" />
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="rounded-xl border moh-border moh-frosted px-4 py-3 text-center">
        <div class="text-sm font-semibold moh-text">Drop images to attach</div>
        <div class="mt-0.5 text-xs moh-text-muted">
          <template v-if="remainingSlots > 0">Up to {{ remainingSlots }} more (max {{ maxSlots }})</template>
          <template v-else>Max {{ maxSlots }} images</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  remainingSlots: number
  maxSlots: number
  accentBorderColor?: string
  /** When true, use less bottom inset (e.g. textarea-only overlay to avoid extra padding at bottom). */
  tightBottom?: boolean
}>()

const visible = computed(() => Boolean(props.visible))
const remainingSlots = computed(() => Math.max(0, Math.floor(props.remainingSlots ?? 0)))
const maxSlots = computed(() => Math.max(1, Math.floor(props.maxSlots ?? 4)))
const accentBorderColor = computed(() => props.accentBorderColor ?? 'var(--moh-compose-accent)')
</script>

