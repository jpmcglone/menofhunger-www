<template>
  <div class="border-t moh-border px-4 py-5">
    <div
      v-if="moreCount > 0"
      class="flex items-center gap-2 text-sm font-semibold moh-text-muted tabular-nums"
    >
      <AppAvatarFacepile
        v-if="authors.length"
        :authors="authors"
      />
      <span>
        {{ moreCount }} more
        {{ moreCount === 1 ? 'reply' : 'replies' }} in the thread
      </span>
    </div>

    <p
      class="text-sm font-semibold moh-text"
      :class="moreCount > 0 ? 'mt-3' : undefined"
      style="text-wrap: balance"
    >
      {{ title }}
    </p>
    <p
      class="mt-1 text-xs moh-text-muted"
      style="text-wrap: pretty"
    >
      {{ subtitle }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <Button
        as="NuxtLink"
        :to="primaryTo"
        :label="primaryLabel"
        rounded
        size="small"
      />
      <Button
        v-if="secondaryTo && secondaryLabel"
        as="NuxtLink"
        :to="secondaryTo"
        :label="secondaryLabel"
        severity="secondary"
        outlined
        rounded
        size="small"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReplyAuthorPreview } from '~/utils/thread-reply-authors'

defineProps<{
  authors: ReplyAuthorPreview[]
  moreCount: number
  title: string
  subtitle: string
  primaryLabel: string
  primaryTo: string
  secondaryLabel?: string
  secondaryTo?: string
}>()
</script>
