<template>
  <div
    role="button"
    tabindex="0"
    aria-label="Log in to post"
    class="cursor-pointer"
    :class="omitAvatar ? 'flex flex-col gap-2' : 'grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-5 items-start'"
    @click="showLoginPrompt"
    @keydown.enter="showLoginPrompt"
    @keydown.space.prevent="showLoginPrompt"
  >
    <div class="row-start-1 flex" :class="inlineAudience ? 'col-start-2 mb-2' : 'col-span-2 justify-end mb-3'" aria-hidden="true">
      <span class="inline-flex min-h-11 items-center justify-center rounded-full border moh-border px-3">
        <AppComposerAudienceLabel visibility="public" />
      </span>
    </div>

    <template v-if="!omitAvatar">
      <div
        class="col-start-1 shrink-0 h-10 w-10 rounded-full ring-1 ring-gray-300 dark:ring-zinc-600 bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"
        :class="inlineAudience ? 'row-start-1 row-span-2' : 'row-start-2'"
        aria-hidden="true"
      >
        <Icon name="tabler:user" class="text-gray-400 dark:text-zinc-500 text-[14px] sm:text-[16px]" />
      </div>
    </template>

    <div
      :class="omitAvatar ? 'min-w-0 moh-composer-tint' : 'row-start-2 col-start-2 min-w-0 moh-composer-tint'"
      class="pointer-events-none select-none"
    >
      <div class="relative">
        <div class="py-1.5 text-xl leading-7 min-h-14 text-gray-400 dark:text-zinc-500 opacity-70">
          {{ VOICE.feed.postHeading }}
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between" :class="mode === 'edit' && !scheduledEditId && 'moh-edit-actions'">
        <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 opacity-40">
          <Button text rounded severity="secondary" disabled aria-hidden="true">
            <template #icon>
              <AppIconGlyph name="image" :size="22" />
            </template>
          </Button>
          <Button text rounded severity="secondary" disabled aria-hidden="true">
            <template #icon>
              <AppIconGlyph name="gif" :size="22" />
            </template>
          </Button>
          <Button text rounded severity="secondary" disabled aria-hidden="true">
            <template #icon>
              <Icon name="tabler:chart-bar" class="rotate-90" aria-hidden="true" />
            </template>
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <div class="moh-meta tabular-nums opacity-40">0/200</div>
          <NuxtLink
            :to="loginTo"
            class="pointer-events-auto cursor-pointer shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold
                   bg-gray-900 text-white hover:bg-gray-700
                   dark:bg-white dark:text-black dark:hover:bg-gray-100
                   transition-colors moh-focus"
            aria-label="Log in to post"
            @click.stop
          >
            Log in
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'

defineProps<{
  omitAvatar?: boolean
  inlineAudience?: boolean
  mode: 'create' | 'edit'
  scheduledEditId: string | null
  loginTo: string
  showLoginPrompt: () => void
}>()
</script>
