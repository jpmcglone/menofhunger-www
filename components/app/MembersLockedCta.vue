<template>
  <div
    class="flex items-center gap-3"
    :class="compact ? 'text-left' : 'flex-col py-2 text-center sm:flex-row sm:text-left'"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-full bg-[rgba(var(--moh-brass-rgb),0.12)] text-[var(--moh-brass)]"
      :class="compact ? 'h-9 w-9' : 'h-11 w-11'"
      aria-hidden="true"
    >
      <Icon name="tabler:lock" :class="compact ? 'h-4 w-4' : 'h-5 w-5'" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold moh-text">{{ title }}</p>
      <p class="mt-0.5 text-xs moh-text-muted">{{ unlock.body }}</p>
    </div>
    <Button as="NuxtLink" :to="unlock.to" :label="unlock.label" size="small" rounded class="shrink-0" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string; compact?: boolean }>(), {
  title: 'Names and faces are for members',
  compact: false,
})

const { unlock } = useMembersAccess()
</script>
