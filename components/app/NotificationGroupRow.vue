<template>
  <div
    :class="[
      'relative flex transition-colors',
      shouldAnimate ? 'transition-all duration-150 ease-out' : '',
      subjectTierRowClass(group),
    ]"
  >
    <!-- Column 1: unread indicator bar (animates in/out) -->
    <div
      :class="[
        'shrink-0 self-stretch origin-left',
        group.readAt ? 'w-0 opacity-0 mr-0' : 'w-1 opacity-100 mr-4',
        shouldAnimate ? 'transition-[width,margin-right,opacity] duration-150 ease-out' : '',
        actorTierIconBgClass(group),
      ]"
      aria-hidden="true"
    />

    <!-- Column 2 -->
    <div
      :class="[
        'flex min-w-0 flex-1 gap-4 ml-1',
        group.readAt ? 'px-4 py-4' : 'pr-4 py-4',
        shouldAnimate ? 'transition-[padding] duration-150 ease-out' : '',
      ]"
    >
      <!-- Left: avatar stack with type icon -->
      <div class="relative flex shrink-0 items-start" @click.stop>
        <div class="relative shrink-0">
          <div class="flex shrink-0 -space-x-2">
            <template v-for="a in group.actors.slice(0, 5)" :key="a.id">
              <NuxtLink
                v-if="a.id && a.username"
                :to="`/u/${a.username}`"
                class="block"
                @click.stop
              >
                <AppUserAvatar
                  :user="{ id: a.id, username: a.username, name: a.name, avatarUrl: a.avatarUrl }"
                  size-class="h-10 w-10"
                />
              </NuxtLink>
              <AppUserAvatar
                v-else-if="a.id"
                :user="{ id: a.id, username: a.username, name: a.name, avatarUrl: a.avatarUrl }"
                size-class="h-10 w-10"
              />
            </template>
            <div
              v-if="group.actorCount > 5"
              class="h-10 w-10 rounded-full border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200"
              aria-hidden="true"
            >
              +{{ group.actorCount - 5 }}
            </div>
          </div>

          <div
            class="absolute -bottom-3 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-black shadow-sm"
            :class="actorTierIconBgClass(group)"
            aria-hidden="true"
          >
            <svg v-if="group.kind === 'boost'" viewBox="0 0 24 24" class="h-4 w-4 text-white">
              <path fill="currentColor" d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z" />
            </svg>
            <Icon v-else :name="groupIconName(group)" class="text-xs text-white" aria-hidden="true" />
          </div>
        </div>
      </div>

      <!-- Center -->
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div :class="['min-w-0 max-w-full line-clamp-2 text-sm', group.readAt ? 'font-medium' : 'font-semibold']">
              <span v-for="(part, idx) in actorDisplayParts(group)" :key="idx">
                <span v-if="part.kind === 'actor'" class="whitespace-nowrap">{{ part.text }}</span>
                <span v-else class="ml-1">{{ part.text }}</span>
              </span>
              <span class="ml-1">{{ titleSuffix(group) }}</span>
              <template v-if="group.kind === 'comment' && group.latestBody">
                <span class="ml-1 italic text-gray-600 dark:text-gray-300">"{{ group.latestBody }}"</span>
              </template>
            </div>
            <div v-if="!group.latestBody && !group.latestSubjectPostPreview?.media?.length" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ contextLabel(group) }}
            </div>
            <div v-if="group.latestSubjectPostPreview?.media?.length" class="mt-2 flex shrink-0 -space-x-2">
              <template v-for="(m, idx) in group.latestSubjectPostPreview.media.slice(0, 4)" :key="idx">
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
                    class="!rounded-none !border-0"
                    :disabled="nudgeInflight || ignoreInflight"
                    @click.stop.prevent="onNudgeBack"
                  />
                  <Button
                    size="small"
                    type="button"
                    severity="secondary"
                    class="!rounded-none !border-0"
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

            <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <ClientOnly>
                <template #fallback>
                  <span aria-hidden="true">&nbsp;</span>
                </template>
                {{ formatWhen(group.createdAt) }}
              </ClientOnly>
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

const { formatWhen } = useNotifications()

const shouldAnimate = ref(false)
onMounted(() => {
  requestAnimationFrame(() => {
    shouldAnimate.value = true
  })
})

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
  if (!actorId) return
  ignoreInflight.value = true
  try {
    await ignoreNudgesByActor(actorId)
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'ignored'
    pushToast({ title: 'Ignored', tone: 'success' })
  } finally {
    ignoreInflight.value = false
  }
}

async function onGotIt() {
  const actorId = group.value.actors?.[0]?.id ?? null
  if (!actorId) return
  ignoreInflight.value = true
  try {
    await markNudgesReadByActor(actorId)
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
    await markNudgesNudgedBackByActor(actorId).catch(() => {})
    await nudgeUser(username)
    localReadAt.value = new Date().toISOString()
    nudgeActionState.value = 'nudged'
    pushToast({ title: 'Nudged back', tone: 'success' })
  } finally {
    nudgeInflight.value = false
  }
}

function actorTierIconBgClass(g: NotificationGroup): string {
  const actors = g.actors ?? []
  // Highest tier wins (premium > verified > normal)
  const hasPremium = actors.some((a) => Boolean((a as any)?.premium))
  if (hasPremium) return 'bg-[var(--moh-premium)]'
  const hasVerified = actors.some((a) => {
    const s = ((a as any)?.verifiedStatus ?? 'none') as string
    return s && s !== 'none'
  })
  if (hasVerified) return 'bg-[var(--moh-verified)]'
  return 'bg-gray-500'
}

function subjectTierRowClass(g: NotificationGroup): string {
  if (g.readAt) return ''
  const t = g.subjectTier ?? null
  if (t === 'premium') return 'bg-[var(--moh-premium)]/5 dark:bg-[var(--moh-premium)]/10'
  if (t === 'verified') return 'bg-[var(--moh-verified)]/5 dark:bg-[var(--moh-verified)]/10'
  return 'bg-gray-50/80 dark:bg-zinc-900/40'
}

function actorLabel(a: NotificationActor): string {
  if (a?.username) return `@${a.username}`
  if (a?.name) return a.name
  return 'Someone'
}

function actorDisplayParts(g: NotificationGroup): Array<{ kind: 'actor' | 'text'; text: string }> {
  const actors = g.actors ?? []
  const a1 = actors[0] ? actorLabel(actors[0]) : 'Someone'
  const a2 = actors[1] ? actorLabel(actors[1]) : ''
  if (g.actorCount <= 1) return [{ kind: 'actor', text: a1 }]
  if (g.actorCount === 2) return [{ kind: 'actor', text: a1 }, { kind: 'text', text: 'and' }, { kind: 'actor', text: a2 }]
  const more = Math.max(0, g.actorCount - 2)
  return [
    { kind: 'actor', text: a1 },
    { kind: 'text', text: ',' },
    { kind: 'actor', text: a2 },
    { kind: 'text', text: 'and' },
    { kind: 'text', text: `${more} more` },
  ]
}

function titleSuffix(g: NotificationGroup): string {
  switch (g.kind) {
    case 'boost':
      return 'boosted your post'
    case 'comment':
      return 'commented on your post'
    case 'follow':
      return 'followed you'
    case 'followed_post':
      return `shared ${g.count} new posts`
    case 'nudge':
      return `nudged you ×${g.count}`
    default:
      return 'Notification'
  }
}

function contextLabel(g: NotificationGroup): string {
  switch (g.kind) {
    case 'boost':
      return 'Boost'
    case 'comment':
      return 'Reply'
    case 'follow':
      return 'New followers'
    case 'followed_post':
      return 'New posts'
    case 'nudge':
      return 'Nudge'
    default:
      return ''
  }
}

function groupIconName(g: NotificationGroup): string {
  switch (g.kind) {
    case 'comment':
      return 'tabler:message-circle'
    case 'follow':
      return 'tabler:user-plus'
    case 'followed_post':
      return 'tabler:file-text'
    case 'nudge':
      return 'tabler:hand-click'
    default:
      return 'tabler:bell'
  }
}
</script>

