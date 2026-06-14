<template>
  <div
    class="relative moh-gutter-x py-3 sm:py-4 border-b moh-border cursor-pointer group"
    role="button"
    tabindex="0"
    :aria-label="`Edit scheduled post: ${item.body.slice(0, 60)}`"
    @click="onRowClick"
    @keydown.enter.prevent="emit('edit', item)"
    @keydown.space.prevent="emit('edit', item)"
  >
    <!-- Subtle hover tint (mirrors PostRow hover bg) -->
    <div class="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 bg-gray-50 dark:bg-white/[0.02]" aria-hidden="true" />

    <div class="relative flex gap-2.5 sm:gap-3">
      <!-- Avatar -->
      <div class="shrink-0 w-10">
        <AppUserAvatar v-if="author" :user="author" size-class="h-10 w-10" bg-class="moh-surface" />
        <div v-else class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-700" />
      </div>

      <!-- Content column -->
      <div class="min-w-0 flex-1">
        <!-- Header: name + badges -->
        <AppPostHeaderLine
          v-if="author"
          :display-name="author.name || author.username || 'You'"
          :username="author.username || ''"
          :verified-status="author.verifiedStatus ?? null"
          :premium="author.premium"
          :premium-plus="author.premiumPlus"
          :is-organization="(author as any).isOrganization ?? false"
          :steward-badge-enabled="(author as any).stewardBadgeEnabled ?? true"
          :profile-path="null"
          post-id=""
          post-permalink=""
          created-at-short=""
          :created-at-tooltip="null"
        />

        <!-- Group tag (if group post) -->
        <NuxtLink
          v-if="item.scheduledCommunityGroup"
          :to="`/g/${encodeURIComponent(item.scheduledCommunityGroup.slug)}`"
          class="mt-1 inline-flex items-center gap-1 rounded-full border moh-border bg-black/[0.025] py-0.5 pl-1.5 pr-2 text-xs font-semibold text-gray-700 dark:bg-white/[0.045] dark:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.075] transition-colors"
          data-post-row-interactive
          @click.stop
        >
          <span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">in</span>
          {{ item.scheduledCommunityGroup.name }}
        </NuxtLink>

        <!-- Scheduled-for meta + visibility tag -->
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <div class="flex items-center gap-1 text-xs moh-text-muted">
            <Icon name="tabler:calendar-time" class="shrink-0" aria-hidden="true" />
            <span>{{ formattedScheduledAt }}</span>
          </div>
          <span
            v-if="visLabel"
            class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            :class="visClass"
          >
            {{ visLabel }}
          </span>
          <span
            v-else
            class="inline-flex items-center rounded-full border border-gray-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium moh-text-muted uppercase tracking-wide"
          >
            Public
          </span>
        </div>

        <!-- Failure banner -->
        <div v-if="item.scheduledError" class="mt-1.5 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          <Icon name="tabler:alert-circle" class="shrink-0 mt-px" aria-hidden="true" />
          <span>Failed to publish: {{ item.scheduledError }}</span>
        </div>

        <!-- Body -->
        <AppPostRowBody
          class="mt-2"
          :body="item.body"
          :has-media="item.media.length > 0"
          :mentions="[]"
          :visibility="item.scheduledVisibility"
        />

        <!-- Media grid -->
        <AppPostMediaGrid
          v-if="item.media.length > 0"
          :media="item.media"
          :post-id="item.id"
          :row-in-view="true"
        />

        <!-- Poll preview -->
        <div v-if="item.poll" class="mt-2.5 flex flex-col gap-1.5" data-post-row-interactive>
          <div
            v-for="(opt, idx) in item.poll.options"
            :key="idx"
            class="text-sm px-3.5 py-2 rounded-full border moh-border moh-text-muted select-none"
          >
            {{ opt.text }}
          </div>
          <p class="text-[11px] moh-text-muted">Poll · {{ item.poll.durationHours }}h</p>
        </div>

        <!-- Actions: Edit + Delete -->
        <div class="mt-3 flex items-center gap-2" data-post-row-interactive @click.stop>
          <Button
            text
            severity="secondary"
            size="small"
            label="Edit"
            @click="emit('edit', item)"
          />
          <Button
            text
            severity="secondary"
            size="small"
            label="Delete"
            class="!text-red-500 dark:!text-red-400"
            @click="emit('delete', item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScheduledPost } from '~/types/api'
import { visibilityTagLabel, visibilityTagClasses } from '~/utils/post-visibility'

const props = defineProps<{ item: ScheduledPost }>()
const emit = defineEmits<{
  (e: 'edit', item: ScheduledPost): void
  (e: 'delete', item: ScheduledPost): void
}>()

const { user: author } = useAuth()

const visLabel = computed(() => visibilityTagLabel(props.item.scheduledVisibility))
const visClass = computed(() => visibilityTagClasses(props.item.scheduledVisibility))

const formattedScheduledAt = computed(() => {
  if (!props.item.scheduledAt) return ''
  return new Date(props.item.scheduledAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
})

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : (target as Node | null)?.parentElement ?? null
  if (!el) return false
  return Boolean(
    el.closest('[data-post-row-interactive], button, a, input, textarea, select, [role="button"]'),
  )
}

function onRowClick(e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  emit('edit', props.item)
}
</script>
