<template>
  <!-- Compact variant: shown after the user has answered, typically placed under the composer
       on /home so the hero doesn't keep eating top real estate once its job is done.

       The card is split into two independently clickable halves:
       · Top (question + answer + social proof) → /check-ins
       · Bottom (weekly mission / streak progress) → /leaderboard
       Each half uses the background-NuxtLink overlay pattern so right-click / cmd-click /
       middle-click "Open in new tab" all work, while the inner crew-streak pill can still
       stop propagation and navigate to the crew page. -->
  <section
    v-if="compact"
    class="moh-checkin-hero-compact relative w-full mb-3 sm:mb-4 px-3 pt-3 sm:px-4 sm:pt-4"
    aria-labelledby="moh-checkin-hero-compact-title"
  >
    <div class="relative rounded-xl border moh-border moh-surface overflow-hidden">

      <!-- ─── Top half: question + answer → /check-ins ─── -->
      <div
        class="relative cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] px-4 pt-3 pb-3 sm:px-5 sm:pt-3.5 sm:pb-3.5"
        role="link"
        tabindex="0"
        aria-label="View today's check-ins"
        @click="onTopClick"
        @auxclick="onTopAuxClick"
        @keydown.enter.prevent="navigateTo('/check-ins/new')"
        @keydown.space.prevent="navigateTo('/check-ins/new')"
      >
        <!-- Background link for browser-native semantics (right-click, cmd-click, etc.) -->
        <NuxtLink
          to="/check-ins/new"
          class="absolute inset-0 z-[1]"
          tabindex="-1"
          aria-hidden="true"
        />

        <div class="relative z-[2]">
          <!-- Header row: label + streak pill. -->
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style="background: rgba(16, 185, 129, 0.12); color: rgb(16, 185, 129)"
              aria-hidden="true"
            >
              <Icon name="tabler:check" size="11" />
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wide moh-text-muted">
              {{ compactLabel }}
            </span>
            <NuxtLink
              v-if="crew && effectiveCrewStreak > 0"
              :to="crewHref"
              class="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums moh-text hover:underline relative z-10"
              style="background: rgba(var(--moh-checkin-rgb), 0.12)"
              @click.stop
            >
              <Icon name="tabler:flame" size="12" class="text-orange-500" aria-hidden="true" />
              {{ effectiveCrewStreak }}d
            </NuxtLink>
            <span
              v-else-if="state?.checkinStreakDays && state.checkinStreakDays > 0"
              class="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums moh-text-muted"
              style="background: rgba(var(--moh-checkin-rgb), 0.08)"
            >
              <Icon name="tabler:flame" size="12" class="text-orange-500" aria-hidden="true" />
              {{ state.checkinStreakDays }}d
            </span>
          </div>

          <!-- Question (the actual prompt). Two lines max so the card stays compact. -->
          <p
            id="moh-checkin-hero-compact-title"
            class="mt-1.5 text-[15px] font-semibold leading-snug moh-text line-clamp-2"
          >
            {{ promptText }}
          </p>

          <!-- The user's answer, quoted. Two lines max for the same reason. -->
          <p
            v-if="myCheckinSnippet"
            class="mt-1 text-[13px] leading-snug moh-text-muted line-clamp-2"
          >
            "{{ myCheckinSnippet }}"
          </p>

          <!-- Compact social proof: tiny crew dots OR mini facepile + one-liner. -->
          <div class="mt-2 flex items-center gap-2 min-w-0">
            <div v-if="crew" class="flex items-center gap-1 shrink-0" aria-hidden="true">
              <span
                v-for="m in crewMembers"
                :key="m.userId"
                class="h-2 w-2 rounded-full"
                :class="m.answeredToday ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'"
                :title="m.answeredToday ? `${m.displayName ?? m.username ?? 'Member'} · answered` : `${m.displayName ?? m.username ?? 'Member'} · waiting`"
              />
            </div>
            <div v-else-if="compactFacepile.length" class="flex -space-x-1.5 shrink-0">
              <div
                v-for="(person, idx) in compactFacepile"
                :key="person.id"
                class="rounded-full ring-2 ring-[var(--moh-bg)]"
                :style="{ zIndex: compactFacepile.length - idx }"
              >
                <AppAvatarCircle
                  :src="person.avatarUrl"
                  :name="person.displayName"
                  :username="person.username"
                  size-class="h-5 w-5"
                  :show-presence="false"
                />
              </div>
            </div>
            <p class="text-xs moh-text-muted truncate min-w-0 flex-1">
              {{ compactSocialProofLine }}
            </p>
          </div>
        </div>
      </div>

      <!-- ─── Bottom half: weekly mission / streak → /leaderboard ─── -->
      <!-- This used to live in its own AppFeedWeeklyMissionCard; folded in here so the
           post-answer surface is one card instead of two. The chevron hints "tap for leaderboard". -->
      <div
        v-if="weeklyMission"
        class="relative border-t moh-border cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] px-4 pt-3 pb-3 sm:px-5 sm:pb-3.5 flex items-center gap-3"
        role="link"
        tabindex="0"
        aria-label="Open the leaderboard to see your streak progress"
        @click="onBottomClick"
        @auxclick="onBottomAuxClick"
        @keydown.enter.prevent="navigateTo('/leaderboard')"
        @keydown.space.prevent="navigateTo('/leaderboard')"
      >
        <NuxtLink
          to="/leaderboard"
          class="absolute inset-0 z-[1]"
          tabindex="-1"
          aria-hidden="true"
        />

        <div
          class="relative z-[2] shrink-0 flex h-11 w-11 flex-col items-center justify-center rounded-xl"
          :class="weeklyMission.status === 'complete'
            ? 'bg-amber-100 dark:bg-amber-500/15'
            : 'bg-gray-100 dark:bg-zinc-800'"
        >
          <span
            class="text-lg font-black leading-none tabular-nums"
            :class="weeklyMission.status === 'complete' ? 'text-amber-600 dark:text-amber-400' : 'moh-text'"
          >{{ effectivePersonalStreak }}</span>
          <span
            class="text-[9px] font-semibold uppercase tracking-wide leading-none mt-0.5"
            :class="weeklyMission.status === 'complete' ? 'text-amber-500 dark:text-amber-400' : 'moh-text-muted'"
          >{{ effectivePersonalStreak === 1 ? 'day' : 'days' }}</span>
        </div>

        <div class="relative z-[2] flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text leading-snug">{{ weeklyMission.headline }}</div>
          <div class="text-[11px] moh-text-muted mt-0.5 leading-snug">{{ weeklyMission.subline }}</div>
          <div class="mt-1.5 flex items-center gap-1.5" aria-hidden="true">
            <span
              v-for="d in weeklyMission.daysTarget"
              :key="d"
              class="h-2 w-2 rounded-full transition-colors"
              :class="d <= weeklyMission.daysCompleted
                ? weeklyMission.status === 'complete' ? 'bg-amber-500' : 'bg-[var(--moh-checkin)]'
                : 'bg-gray-200 dark:bg-zinc-700'"
            />
          </div>
        </div>

        <Icon
          name="tabler:chevron-right"
          class="relative z-[2] shrink-0 text-sm moh-text-muted"
          aria-hidden="true"
        />
      </div>

    </div>
  </section>

  <section
    v-else
    class="moh-checkin-hero relative w-full mb-3 sm:mb-4 px-3 pt-3 sm:px-4 sm:pt-4"
    aria-labelledby="moh-checkin-hero-title"
  >
    <div
      class="relative overflow-hidden rounded-2xl border moh-border"
      :style="cardStyle"
    >
      <!-- Subtle accent stripe along the top to make the hero feel like a hero, not a card. -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-1"
        style="background: linear-gradient(90deg, var(--moh-checkin) 0%, transparent 100%); opacity: 0.5"
        aria-hidden="true"
      />

      <div class="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5">
        <!-- Header tag — small, low-key. The prompt itself is the headline. -->
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            :style="badgeStyle"
          >
            <Icon name="tabler:calendar-check" size="11" aria-hidden="true" />
            {{ headerLabel }}
          </span>
          <!-- Crew streak pill (preferred when in a crew); falls back to personal streak otherwise. -->
          <NuxtLink
            v-if="crew && effectiveCrewStreak > 0"
            :to="crewHref"
            class="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums moh-text hover:underline"
            style="background: rgba(var(--moh-checkin-rgb), 0.12)"
          >
            <Icon name="tabler:flame" size="12" class="text-orange-500" aria-hidden="true" />
            Crew streak · {{ effectiveCrewStreak }}d
          </NuxtLink>
          <span
            v-else-if="state?.checkinStreakDays && state.checkinStreakDays > 0"
            class="ml-auto inline-flex items-center gap-1 text-xs font-semibold tabular-nums moh-text-muted"
          >
            <Icon name="tabler:flame" size="13" class="text-orange-500" aria-hidden="true" />
            {{ state.checkinStreakDays }}d
          </span>
        </div>

        <!-- Big prompt — the only thing the eye should land on. -->
        <h1
          id="moh-checkin-hero-title"
          class="mt-3 text-xl sm:text-2xl font-bold leading-snug moh-text"
        >
          {{ promptText }}
        </h1>

        <!-- Answered: show the user's own answer + quiet confirmation. -->
        <div v-if="hasAnswered" class="mt-4">
          <div class="flex items-center gap-2 text-sm font-semibold moh-text">
            <Icon name="tabler:check" class="text-emerald-500" size="16" aria-hidden="true" />
            <span>You answered today.</span>
          </div>
          <p
            v-if="myCheckinSnippet"
            class="mt-2 text-[15px] leading-relaxed moh-text-muted"
          >
            "{{ myCheckinSnippet }}"
          </p>
        </div>

        <!-- Not answered: single primary action. Logged-out users go to login wall. -->
        <div v-else class="mt-5">
          <Button
            v-if="!isAuthed"
            label="Log in to answer"
            severity="contrast"
            rounded
            class="w-full sm:w-auto"
            @click="handleLoginToAnswer"
          />
          <Button
            v-else-if="canAnswer"
            label="Answer"
            severity="contrast"
            rounded
            class="w-full sm:w-auto"
            :disabled="answering"
            @click="handleAnswer"
          >
            <template #icon>
              <Icon name="tabler:edit" size="16" aria-hidden="true" />
            </template>
          </Button>
          <p
            v-else
            class="text-sm moh-text-muted"
          >
            Verify your account to answer today's question.
          </p>
        </div>

        <!-- Social proof footer: facepile + count line, OR crew status row. Always present (never
             collapses) so the hero stays the same height before/after answering. -->
        <div v-if="crew" class="mt-5">
          <div class="flex items-center gap-2">
            <div
              v-for="m in crewMembers"
              :key="m.userId"
              class="relative"
              :title="m.answeredToday ? `${m.displayName ?? m.username ?? 'Member'} · answered` : `${m.displayName ?? m.username ?? 'Member'} · waiting`"
            >
              <AppAvatarCircle
                :src="m.avatarUrl"
                :name="m.displayName"
                :username="m.username"
                size-class="h-8 w-8"
                :show-presence="false"
                :class="m.answeredToday ? '' : 'opacity-40 grayscale'"
              />
              <span
                v-if="m.answeredToday"
                class="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[var(--moh-bg)]"
                aria-hidden="true"
              >
                <Icon name="tabler:check" size="9" class="text-white" />
              </span>
            </div>
          </div>
          <p class="mt-2 text-sm moh-text-muted">
            {{ crewStatusLine }}
          </p>
        </div>
        <div v-else class="mt-5 flex items-center gap-3">
          <div v-if="facepile.length" class="flex -space-x-2">
            <div
              v-for="(person, idx) in facepile"
              :key="person.id"
              class="rounded-full ring-2 ring-[var(--moh-bg)]"
              :style="{ zIndex: facepile.length - idx }"
            >
              <AppAvatarCircle
                :src="person.avatarUrl"
                :name="person.displayName"
                :username="person.username"
                size-class="h-7 w-7"
                :show-presence="false"
              />
            </div>
          </div>
          <p class="text-sm moh-text-muted truncate min-w-0 flex-1">
            {{ socialProofLine }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  CheckinAnswerer,
  CheckinAllowedVisibility,
  CheckinCrewBlock,
  CheckinCrewMemberStatus,
  PostVisibility,
  WsCheckinAnsweredTodayPayload,
} from '~/types/api'
import type { WsCrewStreakAdvancedPayload, WsCrewStreakBrokenPayload } from '~/composables/usePresence'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'
import { deriveWeeklyMission } from '~/config/milestones'

const props = defineProps<{
  /** When provided, the hero uses this for the prompt text + answered state instead of fetching. */
  prompt?: string
  state: {
    dayKey?: string
    prompt?: string
    hasCheckedInToday?: boolean
    checkinStreakDays?: number
    coins?: number
    allowedVisibilities?: CheckinAllowedVisibility[]
    crew?: CheckinCrewBlock | null
    socialProof?: {
      dayKey: string
      totalToday: number
      recentAnswerers: CheckinAnswerer[]
    } | null
  } | null
  /** Last submitted check-in body for the "you answered" echo. Optional. */
  myCheckinBody?: string | null
  /** Whether the viewer can actually create a check-in (verified+). */
  canAnswer: boolean
  /** Open the inline composer — owned by the parent page so we don't dictate UX. */
  onAnswer: () => void
  /** Login flow trigger for unauth visitors. */
  onLoginToAnswer: () => void
  /** Optional preferred visibility for the answer button (only used for messaging today; no UI here). */
  preferredVisibility?: PostVisibility
  /**
   * Compact mode: a single-row, low-key card meant to live UNDER the composer once the
   * user has answered today's question. Same data + realtime hooks as the full hero,
   * just collapsed so the home page doesn't keep dedicating its tallest slot to a
   * task that's already done.
   */
  compact?: boolean
  /**
   * When > 0 in compact mode, the weekly-mission progress (formerly its own card) is
   * folded into the bottom of this card and the whole card becomes a clickable link
   * to /leaderboard. Pass `state.checkinStreakDays` from the parent (gated on the
   * parent's "verified viewer" check, since check-ins / streaks require verification).
   */
  weeklyMissionStreakDays?: number
  /** Override where the whole compact card navigates on click. Defaults to /leaderboard
   *  when a weekly mission is shown, otherwise the card is non-clickable. */
  compactHref?: string | null
}>()

const { isAuthed } = useAuth()
const { addCheckinsCallback, removeCheckinsCallback, addCrewCallback, removeCrewCallback } = usePresence()
const { dayKey: etDayKey } = useEasternMidnightRollover()
const _openComposer = inject(MOH_OPEN_COMPOSER_KEY, null) // referenced for parity; parent owns onAnswer

const answering = ref(false)
const totalToday = ref(0)
const recentAnswerers = ref<CheckinAnswerer[]>([])

// Local mirrors of crew streak state so realtime updates don't have to wait for
// the parent page to re-fetch /checkins/today. Falls back to the prop value.
const localCrewStreak = ref<number | null>(null)
const localCrewLongest = ref<number | null>(null)
const localCrewLastCompletedDayKey = ref<string | null>(null)

const crew = computed<CheckinCrewBlock | null>(() => props.state?.crew ?? null)
const crewMembers = computed<CheckinCrewMemberStatus[]>(() => crew.value?.memberStatus ?? [])
const crewAnsweredCount = computed(() => crewMembers.value.filter((m) => m.answeredToday).length)
const crewMemberCount = computed(() => crewMembers.value.length)
const crewAllAnswered = computed(() => crewMemberCount.value > 0 && crewAnsweredCount.value === crewMemberCount.value)
const crewMissingCount = computed(() => Math.max(0, crewMemberCount.value - crewAnsweredCount.value))
const crewAnsweredNames = computed(() =>
  crewMembers.value
    .filter((m) => m.answeredToday)
    .map((m) => displayCrewMemberName(m))
    .filter(Boolean),
)

const effectiveCrewStreak = computed(() => {
  if (localCrewStreak.value != null) return localCrewStreak.value
  return crew.value?.currentStreakDays ?? 0
})

const cardStyle = {
  background: 'linear-gradient(180deg, var(--moh-checkin-soft) 0%, transparent 100%)',
}
const badgeStyle = {
  background: 'rgba(var(--moh-checkin-rgb), 0.15)',
  color: 'var(--moh-checkin)',
}

const promptText = computed(() => {
  const p = (props.prompt ?? props.state?.prompt ?? '').trim()
  return p || "How are you doing today?"
})

const headerLabel = computed(() => (crew.value ? "Your crew's question today" : "Today's question"))
const crewHref = computed(() => (crew.value ? `/c/${crew.value.slug}` : '/c'))

function displayCrewMemberName(member: CheckinCrewMemberStatus): string {
  return (member.displayName ?? member.username ?? 'A brother').trim()
}

function formatCrewNames(names: string[], max = 2): string {
  const cleaned = names.map((n) => n.trim()).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]!
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`
  const visible = cleaned.slice(0, max)
  const others = cleaned.length - visible.length
  if (visible.length === 1) return `${visible[0]} and ${others} other${others === 1 ? '' : 's'}`
  return `${visible[0]}, ${visible[1]}, and ${others} other${others === 1 ? '' : 's'}`
}

function missingCrewSuffix(missing: number): string {
  if (missing <= 0) return "Everyone's in."
  return `${missing} still need${missing === 1 ? 's' : ''} to check in.`
}

const crewStatusLine = computed(() => {
  const total = crewMemberCount.value
  if (total === 0) return ''
  const answered = crewAnsweredCount.value
  const missing = crewMissingCount.value
  const answeredNames = formatCrewNames(crewAnsweredNames.value)
  if (crewAllAnswered.value) {
    const days = effectiveCrewStreak.value
    const prefix = answeredNames
      ? `${answeredNames} from your crew checked in.`
      : `All ${total} from your crew checked in.`
    if (days >= 2) return `${prefix} Day ${days} locked in.`
    return `${prefix} Day 1 on the board.`
  }
  if (answered === 0) return `No one from your crew has checked in yet. ${missingCrewSuffix(missing)}`
  return `${answeredNames} from your crew checked in. ${missingCrewSuffix(missing)}`
})

const hasAnswered = computed(() => Boolean(props.state?.hasCheckedInToday))
const myCheckinSnippet = computed(() => {
  const raw = (props.myCheckinBody ?? '').trim()
  if (!raw) return null
  return raw.length > 220 ? `${raw.slice(0, 217)}…` : raw
})

const facepile = computed(() => recentAnswerers.value.slice(0, 5))
const compactFacepile = computed(() => recentAnswerers.value.slice(0, 3))

// Personal streak shown in the weekly-mission badge. Use the stronger of: prop value (from
// /checkins/today) and what's in the answeredToday realtime payloads. We don't have a
// realtime mirror for personal streak yet, so this is just the prop value.
const effectivePersonalStreak = computed(() => {
  const fromState = Number(props.state?.checkinStreakDays ?? 0) || 0
  const fromMissionProp = Number(props.weeklyMissionStreakDays ?? 0) || 0
  return Math.max(fromState, fromMissionProp)
})

// Weekly mission section: shown whenever we have a positive personal streak, whether the parent
// explicitly passes `weeklyMissionStreakDays` or we read it directly from state. This lets the
// compact card always fold in the mission for any user who has answered today (crew or not) without
// requiring the parent to pass the prop. `effectivePersonalStreak` is already the max of both.
const weeklyMission = computed(() => {
  const streak = effectivePersonalStreak.value
  if (streak <= 0) return null
  return deriveWeeklyMission(streak)
})

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      ['a', 'button', 'iframe', 'input', 'textarea', 'select',
       '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
    ),
  )
}

function onTopClick(e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    if (typeof window !== 'undefined') window.open('/check-ins/new', '_blank')
    return
  }
  void navigateTo('/check-ins/new')
}

function onTopAuxClick(e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  if (typeof window !== 'undefined') window.open('/check-ins/new', '_blank')
}

function onBottomClick(e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    if (typeof window !== 'undefined') window.open('/leaderboard', '_blank')
    return
  }
  void navigateTo('/leaderboard')
}

function onBottomAuxClick(e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  if (typeof window !== 'undefined') window.open('/leaderboard', '_blank')
}

const compactLabel = computed(() => {
  if (crew.value && crewAllAnswered.value) {
    const days = effectiveCrewStreak.value
    if (days >= 2) return `Crew · Day ${days}`
    return 'Crew · locked in'
  }
  if (crew.value) return "Your crew's question · answered"
  return "Today's question · answered"
})

const compactSocialProofLine = computed(() => {
  if (crew.value) {
    const total = crewMemberCount.value
    if (total === 0) return 'Your crew is waiting to check in.'
    const answeredNames = formatCrewNames(crewAnsweredNames.value, 1)
    if (crewAllAnswered.value) {
      return answeredNames
        ? `${answeredNames} from your crew checked in. Everyone's in.`
        : `All ${total} from your crew checked in.`
    }
    if (!answeredNames) return `No one from your crew has checked in yet. ${missingCrewSuffix(crewMissingCount.value)}`
    return `${answeredNames} from your crew checked in. ${missingCrewSuffix(crewMissingCount.value)}`
  }
  // Mirror the full hero's wording but tightened for one line.
  const total = totalToday.value
  if (total <= 1) return "You're the first today."
  const others = Math.max(0, total - 1)
  return `${others.toLocaleString()} other${others === 1 ? '' : 's'} answered today.`
})

const socialProofLine = computed(() => {
  const total = totalToday.value
  const list = recentAnswerers.value
  if (total <= 0) {
    return hasAnswered.value
      ? "You're the first today. Nice work."
      : 'Be the first to answer today.'
  }
  if (list.length === 0) {
    return total === 1
      ? '1 person answered today.'
      : `${total.toLocaleString()} answered today.`
  }
  const names = list.slice(0, 2).map((p) => p.displayName ?? p.username ?? 'Someone').filter(Boolean)
  const remainder = Math.max(0, total - names.length)
  if (remainder === 0) {
    if (names.length === 1) return `${names[0]} answered today.`
    return `${names[0]} and ${names[1]} answered today.`
  }
  if (names.length === 1) {
    return `${names[0]} and ${remainder.toLocaleString()} other${remainder === 1 ? '' : 's'} answered today.`
  }
  return `${names[0]}, ${names[1]}, and ${remainder.toLocaleString()} other${remainder === 1 ? '' : 's'} answered today.`
})

function refreshSocialProof() {
  const data = props.state?.socialProof ?? null
  totalToday.value = Math.max(0, Number(data?.totalToday ?? 0) || 0)
  recentAnswerers.value = Array.isArray(data?.recentAnswerers) ? data.recentAnswerers : []
}

const answeredCb = {
  onAnsweredToday: (payload: WsCheckinAnsweredTodayPayload) => {
    if (!payload?.dayKey || payload.dayKey !== (props.state?.dayKey ?? etDayKey.value)) return
    totalToday.value = Math.max(totalToday.value, Number(payload.totalToday ?? 0) || 0)
    const a = payload.answerer
    if (!a?.id) return
    const exists = recentAnswerers.value.some((p) => p.id === a.id)
    if (exists) return
    recentAnswerers.value = [
      {
        id: a.id,
        username: a.username ?? null,
        displayName: a.displayName ?? null,
        avatarUrl: a.avatarUrl ?? null,
        answeredAt: new Date().toISOString(),
        isFollowed: a.isFollowed,
      },
      ...recentAnswerers.value,
    ].slice(0, 5)
  },
}

// Crew streak realtime: bump local mirrors when the server signals an advance/break.
// The full /checkins/today payload is owned by the parent page; we only need to keep
// the streak pill / member-status copy in sync without a refetch.
const crewCb = {
  onStreakAdvanced: (payload: WsCrewStreakAdvancedPayload) => {
    if (!crew.value || crew.value.id !== payload.crewId) return
    localCrewStreak.value = Math.max(0, Number(payload.currentStreakDays ?? 0) || 0)
    localCrewLongest.value = Math.max(localCrewLongest.value ?? 0, Number(payload.longestStreakDays ?? 0) || 0)
    localCrewLastCompletedDayKey.value = payload.dayKey ?? null
  },
  onStreakBroken: (payload: WsCrewStreakBrokenPayload) => {
    if (!crew.value || crew.value.id !== payload.crewId) return
    localCrewStreak.value = 0
  },
}

onMounted(() => {
  refreshSocialProof()
  addCheckinsCallback(answeredCb)
  addCrewCallback(crewCb)
})

onBeforeUnmount(() => {
  removeCheckinsCallback(answeredCb)
  removeCrewCallback(crewCb)
})

watch(etDayKey, () => {
  refreshSocialProof()
  // New day — drop any local streak overrides; trust the next /checkins/today payload.
  localCrewStreak.value = null
  localCrewLongest.value = null
  localCrewLastCompletedDayKey.value = null
})

watch(() => props.state?.socialProof, () => refreshSocialProof(), { immediate: true })

defineExpose({ refreshSocialProof })

function handleAnswer() {
  if (answering.value) return
  answering.value = true
  try {
    props.onAnswer()
  } finally {
    nextTick(() => {
      answering.value = false
    })
  }
}

function handleLoginToAnswer() {
  props.onLoginToAnswer()
}
</script>
