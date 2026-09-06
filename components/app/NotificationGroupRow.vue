<template>
  <div class="relative transition-colors" :class="subjectTierRowClass(group)">
    <div v-if="!group.readAt" class="absolute inset-y-0 left-0 w-0.5 bg-[var(--moh-brass)]" aria-hidden="true" />
    <div class="flex min-w-0 gap-3 px-4 py-4" :class="{ 'items-center': group.kind === 'follow' }">
      <AppNotificationActors v-if="group.kind === 'follow'" :actors="group.actors.slice(0, 1)" :size="40" class="shrink-0" />
      <AppNotificationEventIcon v-else :kind="group.kind" :actors="group.actors" />
      <!-- Center -->
      <div class="min-w-0 flex-1">
        <AppNotificationActors v-if="group.kind !== 'follow'" :actors="group.actors" :actor-count="group.actorCount" class="mb-2" />
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div class="min-w-0 flex-1">
            <div class="min-w-0 max-w-full text-[15px] leading-snug moh-text">
              <template v-if="group.kind === 'followed_post' && group.actorCount === 1 && group.count > 1">
                <span class="whitespace-nowrap tabular-nums">{{ group.count }} posts</span>
                <span class="ml-1">from</span>
                <span
                  class="ml-1 font-semibold"
                  @mouseenter="(e) => multiTrigger.onEnter(group.actors?.[0]?.username, e)"
                  @mousemove="multiTrigger.onMove"
                  @mouseleave="multiTrigger.onLeave"
                >{{ actorLabel(group.actors?.[0] as any) }}</span>
              </template>
              <template v-else-if="group.kind === 'nudge' && group.count > 1">
                <span
                  class="font-semibold"
                  @mouseenter="(e) => multiTrigger.onEnter(group.actors?.[0]?.username, e)"
                  @mousemove="multiTrigger.onMove"
                  @mouseleave="multiTrigger.onLeave"
                >{{ actorLabel(group.actors?.[0] as any) }}</span>
                <span class="ml-1">nudged you</span>
                <span class="ml-1 whitespace-nowrap tabular-nums">×{{ group.count }}</span>
              </template>
              <template v-else>
                <span v-for="(part, idx) in actorDisplayParts(group)" :key="actorDisplayPartKey(part, idx)">
                  <span
                    v-if="part.kind === 'actor'"
                    class="font-semibold"
                    :class="idx > 0 ? 'ml-1' : ''"
                    @mouseenter="(e) => multiTrigger.onEnter(part.username, e)"
                    @mousemove="multiTrigger.onMove"
                    @mouseleave="multiTrigger.onLeave"
                  >{{ part.text }}</span>
                  <span v-else class="ml-1">{{ part.text }}</span>
                </span>
                <span class="ml-1">{{ titleSuffix(group) }}</span>
              </template>
              <ClientOnly>
                <template #fallback>
                  <span aria-hidden="true">&nbsp;</span>
                </template>
                <span
                  v-tooltip.bottom="tinyTooltip(formatWhenFull(group.createdAt))"
                  class="ml-1 whitespace-nowrap font-normal text-gray-500 dark:text-gray-400 tabular-nums"
                >
                  · {{ formatWhen(group.createdAt) }}
                </span>
              </ClientOnly>
            </div>
            <div
              v-if="!isGroupBoostOfStatus(group) && (group.latestSubjectPostPreview?.bodySnippet || group.latestBody)"
              class="mt-1 line-clamp-2 text-[15px] leading-snug moh-text-muted"
            >
              {{ group.latestSubjectPostPreview?.bodySnippet || group.latestBody }}
            </div>
            <AppStatusBubble
              v-else-if="isGroupBoostOfStatus(group) && groupStatusBoostText(group)"
              :text="groupStatusBoostText(group)!"
              class="mt-1.5"
            />
            <div v-if="group.latestSubjectPostPreview?.media?.length" class="mt-2 flex shrink-0 -space-x-2">
              <template v-for="(m, idx) in group.latestSubjectPostPreview.media.slice(0, 4)" :key="groupMediaPreviewKey(m, idx)">
                <img
                  v-if="(m.kind === 'video' ? m.thumbnailUrl : m.url)"
                  :src="m.kind === 'video' ? (m.thumbnailUrl || m.url) : m.url"
                  :alt="''"
                  class="h-8 w-8 shrink-0 rounded border border-gray-200 object-cover dark:border-zinc-700 bg-black"
                  loading="lazy"
                >
              </template>
            </div>
          </div>
          <div class="shrink-0 flex items-start gap-3">
            <!-- Smart actions (nudge groups) -->
            <div
              v-if="group.kind === 'nudge'"
              class="max-w-[14rem] flex flex-wrap items-center justify-end gap-2"
              @click.stop.prevent
            >
              <span
                v-if="nudgeActionState === 'gotit'"
                class="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                Got it
              </span>
              <span
                v-else-if="nudgeActionState === 'ignored'"
                class="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                Ignored
              </span>
              <span
                v-else-if="nudgeActionState === 'nudged'"
                class="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                Nudged back
              </span>
              <template v-else-if="nudgeIsTopmost && (canShowNudgeBack || !group.readAt)">
                <div class="inline-flex overflow-hidden rounded-xl border moh-border" @click.stop.prevent>
                  <Button
                    v-if="canShowNudgeBack"
                    size="small"
                    label="Nudge back"
                    severity="secondary"
                    class="!rounded-none !border-0 !text-xs"
                    :disabled="nudgeInflight || ignoreInflight"
                    @click.stop.prevent="onNudgeBack"
                  />
                  <Button
                    size="small"
                    type="button"
                    severity="secondary"
                    class="!rounded-none !border-0 !text-xs"
                    :class="canShowNudgeBack ? '!px-2' : ''"
                    aria-label="More nudge actions"
                    aria-haspopup="true"
                    :disabled="nudgeInflight || ignoreInflight"
                    @click.stop.prevent="toggleNudgeMenu"
                  >
                    <template #icon>
                      <Icon name="tabler:chevron-down" aria-hidden="true" />
                    </template>
                    <span v-if="!canShowNudgeBack" class="ml-1">Actions</span>
                  </Button>
                </div>
                <Menu v-if="nudgeMenuMounted" ref="nudgeMenuRef" :model="nudgeMenuItems" popup>
                  <template #item="{ item, props }">
                    <a v-bind="props.action" class="flex items-center gap-2">
                      <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                      <span
                        v-bind="props.label"
                        class="flex-1"
                      v-tooltip.bottom="
                        item.value === 'ignore'
                          ? tinyTooltip(ignoreNudgeTooltip)
                          : item.value === 'gotit'
                            ? tinyTooltip(gotItNudgeTooltip)
                            : undefined
                      "
                      >
                        {{ item.label }}
                      </span>
                    </a>
                  </template>
                </Menu>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowSummaryResponse, NotificationActor, NotificationGroup } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { MenuItem } from 'primevue/menuitem'
import { stableListKey } from '~/utils/stable-list-key'

const multiTrigger = useUserPreviewMultiTrigger()

const { formatWhen, formatWhenFull } = useNotifications()

const props = defineProps<{
  group: NotificationGroup
  nudgeIsTopmost?: boolean
}>()

const localReadAt = ref<string | null>(null)
const group = computed<NotificationGroup>(() => {
  if (!localReadAt.value) return props.group
  return { ...props.group, readAt: localReadAt.value }
})
const nudgeIsTopmost = computed(() => props.nudgeIsTopmost !== false)

const { nudgeUser, ignoreNudgesByActor, markNudgesNudgedBackByActor, markNudgesReadByActor } = useNudge()
const { push: pushToast } = useAppToast()
const { apiFetchData } = useApiClient()

const nudgeActionState = ref<'idle' | 'nudged' | 'ignored' | 'gotit'>('idle')
const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'
const canShowNudgeBack = ref(false)
const nudgeInflight = ref(false)
const ignoreInflight = ref(false)

type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }
const nudgeMenuMounted = ref(false)
const nudgeMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)
const nudgeMenuItems = computed<MenuItemWithIcon[]>(() => [
  { label: 'Got it', iconName: 'tabler:check', value: 'gotit', command: () => void onGotIt() },
  { label: 'Ignore', iconName: 'tabler:ban', value: 'ignore', command: () => void onIgnore() },
])

async function toggleNudgeMenu(event: Event) {
  nudgeMenuMounted.value = true
  await nextTick()
  nudgeMenuRef.value?.toggle(event)
}

onMounted(async () => {
  if (group.value.kind !== 'nudge') return
  const username = group.value.actors?.[0]?.username ?? null
  if (!username) return
  try {
    const rel = await apiFetchData<FollowSummaryResponse>(
      `/follows/summary/${encodeURIComponent(username)}`,
      { method: 'GET' },
    )
    const mutual = Boolean(rel?.viewerFollowsUser && rel?.userFollowsViewer)
    const canNudgeNow = mutual && !rel?.nudge?.outboundPending
    canShowNudgeBack.value = Boolean(canNudgeNow)
  } catch {
    canShowNudgeBack.value = false
  }
})

async function onIgnore() {
  const actorId = group.value.actors?.[0]?.id ?? null
  const username = group.value.actors?.[0]?.username ?? null
  if (!actorId) return
  ignoreInflight.value = true
  try {
    await ignoreNudgesByActor(actorId, { username })
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'ignored'
    pushToast({ title: 'Ignored', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onGotIt() {
  const actorId = group.value.actors?.[0]?.id ?? null
  const username = group.value.actors?.[0]?.username ?? null
  if (!actorId) return
  ignoreInflight.value = true
  try {
    await markNudgesReadByActor(actorId, { username })
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'gotit'
    pushToast({ title: 'Got it', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onNudgeBack() {
  const actorId = group.value.actors?.[0]?.id ?? null
  const username = group.value.actors?.[0]?.username ?? null
  if (!actorId || !username) return
  nudgeInflight.value = true
  try {
    // Persist "you nudged back" for this actor's nudges, then send our nudge.
    await markNudgesNudgedBackByActor(actorId, { username }).catch(() => {})
    await nudgeUser(username)
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'nudged'
    pushToast({ title: 'Nudged back', tone: 'success' })
  } finally {
    nudgeInflight.value = false
  }
}

function subjectTierRowClass(g: NotificationGroup): string {
  if (g.readAt) return ''
  const t = g.subjectTier ?? null
  if (t === 'premium') return 'bg-[var(--moh-premium)]/5 dark:bg-[var(--moh-premium)]/10'
  if (t === 'verified') return 'bg-[var(--moh-verified)]/5 dark:bg-[var(--moh-verified)]/10'
  return 'bg-gray-50/80 dark:bg-zinc-900/40'
}

function actorLabel(a: NotificationActor): string {
  if (a?.name?.trim()) return a.name.trim()
  if (a?.username) return `@${a.username}`
  return 'Someone'
}

function actorDisplayParts(g: NotificationGroup): Array<{ kind: 'actor' | 'text'; text: string; username?: string }> {
  const actors = g.actors ?? []
  const a1 = actors[0] ? actorLabel(actors[0]) : 'Someone'
  const a2 = actors[1] ? actorLabel(actors[1]) : ''
  if (g.actorCount <= 1) return [{ kind: 'actor', text: a1, username: actors[0]?.username ?? undefined }]
  if (g.actorCount === 2) return [
    { kind: 'actor', text: a1, username: actors[0]?.username ?? undefined },
    { kind: 'text', text: 'and' },
    { kind: 'actor', text: a2, username: actors[1]?.username ?? undefined },
  ]
  const more = Math.max(0, g.actorCount - 2)
  return [
    { kind: 'actor', text: a1, username: actors[0]?.username ?? undefined },
    { kind: 'text', text: ',' },
    { kind: 'actor', text: a2, username: actors[1]?.username ?? undefined },
    { kind: 'text', text: 'and' },
    { kind: 'text', text: `${more} more` },
  ]
}

function actorDisplayPartKey(
  part: { kind: 'actor' | 'text'; text: string; username?: string },
  idx: number,
): string {
  return stableListKey('actor-part', part.kind, part.username ?? '', part.text, idx)
}

function groupMediaPreviewKey(
  media: { kind?: string | null; url?: string | null; thumbnailUrl?: string | null },
  idx: number,
): string {
  return stableListKey('media', media.kind ?? 'unknown', media.thumbnailUrl ?? media.url ?? 'none', idx)
}

function titleSuffix(g: NotificationGroup): string {
  switch (g.kind) {
    case 'boost':
      return g.latestSubjectPostPreview?.kind === 'status'
        ? 'boosted your status'
        : 'boosted your post'
    case 'repost':
      return 'reposted your post'
    case 'comment':
      return 'replied to your post'
    case 'follow':
      return 'followed you'
    case 'followed_post':
      return g.count > 1 ? `posted ${g.count} times` : 'posted'
    case 'nudge':
      // Groups only form for count > 1; keep the plain suffix as a safe fallback.
      return g.count > 1 ? `nudged you ×${g.count}` : 'nudged you'
    default:
      return 'Notification'
  }
}

function isGroupBoostOfStatus(g: NotificationGroup): boolean {
  return g.kind === 'boost' && g.latestSubjectPostPreview?.kind === 'status'
}

function groupStatusBoostText(g: NotificationGroup): string | null {
  if (!isGroupBoostOfStatus(g)) return null
  const fromPreview = (g.latestSubjectPostPreview?.bodySnippet ?? '').trim()
  if (fromPreview) return fromPreview
  const fromBody = (g.latestBody ?? '').trim()
  return fromBody || null
}

</script>
