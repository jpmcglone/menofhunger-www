<template>
  <div class="flex items-start gap-2.5">
    <AppUserAvatar
      v-if="marvUser"
      :user="marvUser"
      size-class="h-7 w-7"
      :show-presence="false"
      :show-status="false"
    />
    <AppMarvMark v-else :size="28" />
    <div class="min-w-0 max-w-[85%] flex flex-col items-start gap-1.5">
      <p class="text-xs font-medium moh-text-muted">{{ marvName }}</p>
      <div
        :class="[
          'max-w-full min-w-0 rounded-[18px] px-3.5 py-3 text-[15px] leading-[21px]',
          error
            ? 'border border-rose-300/60 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
            : 'border border-gray-200 dark:border-zinc-600',
        ]"
      >
        <p v-if="error">{{ errorText }}</p>
        <template v-else-if="result">
          <p v-if="result.stale && stalenessLabel" class="mb-2 text-[12px] font-medium text-amber-700 dark:text-amber-300">
            {{ stalenessLabel }}
          </p>
          <template v-if="result.sections">
            <template v-if="result.sections.since">
              <p class="mb-1 text-[13px] font-semibold">What's new</p>
              <AppMarvMarkdown :text="result.sections.since" />
            </template>
            <p class="sr-only">{{ postSectionLabel }}</p>
            <AppMarvMarkdown :text="result.sections.post" />
            <template v-if="result.sections.replies">
              <p class="mb-1 mt-4 text-[13px] font-semibold">In the replies</p>
              <AppMarvMarkdown :text="result.sections.replies" />
            </template>
          </template>
          <AppMarvMarkdown v-else :text="result.summary" />
        </template>
      </div>
      <p v-if="meta || summaryMeta || costBreakdownLabel" class="text-[11px] moh-text-muted">
        {{ meta || [summaryMeta, result?.cached ? 'cached' : null, costBreakdownLabel].filter(Boolean).join(' · ') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarvinCatchUpDto } from '~/types/api'
import type { AvatarVideoDto } from '~/types/api-contracts.gen'

withDefaults(
  defineProps<{
    result?: MarvinCatchUpDto | null
    error?: boolean
    errorText?: string
    stalenessLabel?: string | null
    summaryMeta?: string
    postSectionLabel?: string
    costBreakdownLabel?: string | null
    meta?: string
    marvName: string
    marvUser?: {
      id: string
      username: string
      name: string
      avatarUrl?: string | null
      avatarVideo?: AvatarVideoDto | null
    } | null
  }>(),
  {
    result: null,
    error: false,
    errorText: '',
    stalenessLabel: null,
    summaryMeta: '',
    postSectionLabel: '',
    costBreakdownLabel: null,
    meta: '',
    marvUser: null,
  },
)
</script>
