<template>
  <!-- Verify-to-check-in: authed-but-unverified. No fetch / realtime in this mode. -->
  <section
    v-if="verifyCta"
    class="moh-checkin-row relative w-full border-b moh-border"
    style="background: var(--moh-checkin-soft)"
    aria-labelledby="moh-checkin-hero-verify-title"
  >
    <span class="moh-checkin-row-accent" aria-hidden="true" />
    <div class="moh-gutter-x py-3">
      <p class="moh-meta" style="color: var(--moh-checkin)">Today</p>
      <h1
        id="moh-checkin-hero-verify-title"
        class="mt-1 moh-body font-semibold moh-serif line-clamp-2"
      >
        {{ promptText }}
      </h1>
      <p class="mt-1 text-sm moh-text-muted">
        Verification unlocks check-ins and your streak.
      </p>
      <div class="mt-2">
        <Button
          as="NuxtLink"
          to="/settings/verification"
          label="Verify to check in"
          rounded
          size="small"
          class="moh-checkin-row-cta"
        />
      </div>
    </div>
  </section>

  <!-- Answered: quiet green line. Row opens today's answers; 7/7 opens the leaderboard. -->
  <section
    v-else-if="compact"
    class="moh-checkin-row relative w-full border-b moh-border"
    style="background: var(--moh-checkin-soft)"
    aria-labelledby="moh-checkin-hero-compact-title"
  >
    <span class="moh-checkin-row-accent" aria-hidden="true" />
    <div
      class="relative cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      role="link"
      tabindex="0"
      :aria-label="answeredAriaLabel"
      @click="onRowNavigate(answeredHref, $event)"
      @auxclick="onRowAuxNavigate(answeredHref, $event)"
      @keydown.enter.prevent="navigateTo(answeredHref)"
      @keydown.space.prevent="navigateTo(answeredHref)"
    >
      <NuxtLink
        :to="answeredHref"
        class="absolute inset-0 z-[1]"
        tabindex="-1"
        aria-hidden="true"
      />
      <div class="relative z-[2] moh-gutter-x py-2.5">
        <p
          id="moh-checkin-hero-compact-title"
          class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 moh-meta"
          style="color: var(--moh-checkin)"
        >
          <Icon name="tabler:check" size="14" aria-hidden="true" />
          <span>{{ answeredHead }}</span>
          <template v-if="streakDaysLabel">
            <span class="opacity-50" aria-hidden="true">·</span>
            <span>{{ streakDaysLabel }}</span>
          </template>
          <template v-if="missionFraction">
            <span class="opacity-50" aria-hidden="true">·</span>
            <NuxtLink
              to="/leaderboard"
              class="relative z-10 underline-offset-2 hover:underline"
              @click.stop
            >{{ missionFraction }}</NuxtLink>
          </template>
        </p>
        <p
          v-if="myCheckinSnippet"
          class="mt-0.5 text-[13px] leading-snug moh-text-muted line-clamp-1"
        >
          "{{ myCheckinSnippet }}"
        </p>
      </div>
    </div>
  </section>

  <!-- Unanswered: first feed row. Row opens answers; Answer is the only button. -->
  <section
    v-else
    class="moh-checkin-row relative w-full border-b moh-border"
    style="background: var(--moh-checkin-soft)"
    aria-labelledby="moh-checkin-hero-title"
  >
    <span class="moh-checkin-row-accent" aria-hidden="true" />
    <div
      class="relative cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      role="link"
      tabindex="0"
      aria-label="View today's check-ins"
      @click="onRowNavigate(answersHref, $event)"
      @auxclick="onRowAuxNavigate(answersHref, $event)"
      @keydown.enter.prevent="navigateTo(answersHref)"
      @keydown.space.prevent="navigateTo(answersHref)"
    >
      <NuxtLink
        :to="answersHref"
        class="absolute inset-0 z-[1]"
        tabindex="-1"
        aria-hidden="true"
      />
      <div class="relative z-[2] moh-gutter-x py-3">
        <p
          class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 moh-meta"
          style="color: var(--moh-checkin)"
        >
          <span>{{ unansweredHead }}</span>
          <template v-if="streakDaysLabel">
            <span class="opacity-50" aria-hidden="true">·</span>
            <span>{{ streakDaysLabel }}</span>
          </template>
          <template v-if="missionFraction">
            <span class="opacity-50" aria-hidden="true">·</span>
            <NuxtLink
              to="/leaderboard"
              class="relative z-10 underline-offset-2 hover:underline"
              @click.stop
            >{{ missionFraction }}</NuxtLink>
          </template>
        </p>
        <h1
          id="moh-checkin-hero-title"
          class="mt-1 moh-body font-semibold moh-serif line-clamp-3"
        >
          {{ promptText }}
        </h1>
        <div class="relative z-10 mt-2.5">
          <Button
            v-if="!isAuthed"
            label="Log in to answer"
            rounded
            size="small"
            class="moh-checkin-row-cta"
            @click.stop="handleLoginToAnswer"
          />
          <Button
            v-else-if="canAnswer"
            label="Answer"
            rounded
            size="small"
            class="moh-checkin-row-cta"
            :disabled="answering"
            @click.stop="handleAnswer"
          />
          <p
            v-else
            class="text-sm moh-text-muted"
          >
            Verify your account to answer today's question.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  CheckinAllowedVisibility,
  CheckinCrewBlock,
  CheckinCrewMemberStatus,
  PostVisibility,
} from '~/types/api'
import type { WsCrewStreakAdvancedPayload, WsCrewStreakBrokenPayload } from '~/composables/usePresence'
import { deriveWeeklyMission } from '~/config/milestones'

const props = defineProps<{
  /** When provided, the hero uses this for the prompt text + answered state instead of fetching. */
  prompt?: string
  state?: {
    dayKey?: string
    prompt?: string
    hasCheckedInToday?: boolean
    checkinStreakDays?: number
    allowedVisibilities?: CheckinAllowedVisibility[]
    crew?: CheckinCrewBlock | null
  } | null
  /** Last submitted check-in body for the "you answered" echo. Optional. */
  myCheckinBody?: string | null
  /** Whether the viewer can actually create a check-in (verified+). */
  canAnswer?: boolean
  /** Open the inline composer — owned by the parent page so we don't dictate UX. */
  onAnswer?: () => void
  /** Login flow trigger for unauth visitors. */
  onLoginToAnswer?: () => void
  /**
   * Verify-to-check-in CTA mode. The whole check-ins experience (feed, streaks,
   * leaderboard) is verified-only, so authed-but-unverified users get a single CTA
   * driving verification instead of the live hero. In this mode the component does
   * NOT fetch or subscribe — it only needs the (client-derived) `prompt`.
   */
  verifyCta?: boolean
  /** Optional preferred visibility for the answer button (only used for messaging today; no UI here). */
  preferredVisibility?: PostVisibility
  /**
   * Compact mode: one quiet line after the user has answered today's question.
   * Same data + realtime hooks as the full row, collapsed so home doesn't keep
   * a campaign card above the feed.
   */
  compact?: boolean
  /**
   * When > 0, weekly-mission progress is folded into row meta (`7/7`) instead
   * of a second banner. Pass `state.checkinStreakDays` from the parent.
   */
  weeklyMissionStreakDays?: number
  /** Override where the compact (answered) row navigates. Defaults to today's answers. */
  compactHref?: string | null
}>()

const { isAuthed } = useAuth()
const { addCrewCallback, removeCrewCallback } = usePresence()
const { dayKey: etDayKey } = useEasternMidnightRollover()

const answering = ref(false)

// Local mirrors of crew streak state so realtime updates don't have to wait for
// the parent page to re-fetch /checkins/today. Falls back to the prop value.
const localCrewStreak = ref<number | null>(null)

const crew = computed<CheckinCrewBlock | null>(() => props.state?.crew ?? null)
const crewMembers = computed<CheckinCrewMemberStatus[]>(() => crew.value?.memberStatus ?? [])
const crewAnsweredCount = computed(() => crewMembers.value.filter((m) => m.answeredToday).length)
const crewMemberCount = computed(() => crewMembers.value.length)
const crewAllAnswered = computed(() => crewMemberCount.value > 0 && crewAnsweredCount.value === crewMemberCount.value)

const effectiveCrewStreak = computed(() => {
  if (localCrewStreak.value != null) return localCrewStreak.value
  return crew.value?.currentStreakDays ?? 0
})

const promptText = computed(() => {
  const p = (props.prompt ?? props.state?.prompt ?? '').trim()
  return p || "How are you doing today?"
})

const answersHref = computed(() => {
  const day = (props.state?.dayKey ?? etDayKey.value ?? '').trim()
  return day ? `/check-ins/day/${day}` : '/check-ins/new'
})

const answeredHref = computed(() => {
  const override = (props.compactHref ?? '').trim()
  return override || answersHref.value
})

const effectivePersonalStreak = computed(() => {
  const fromState = Number(props.state?.checkinStreakDays ?? 0) || 0
  const fromMissionProp = Number(props.weeklyMissionStreakDays ?? 0) || 0
  return Math.max(fromState, fromMissionProp)
})

const weeklyMission = computed(() => {
  const streak = effectivePersonalStreak.value
  if (streak <= 0) return null
  return deriveWeeklyMission(streak)
})

const streakDaysLabel = computed(() => {
  if (crew.value && effectiveCrewStreak.value > 0) return `${effectiveCrewStreak.value}d`
  if (effectivePersonalStreak.value > 0) return `${effectivePersonalStreak.value}d`
  return null
})

const missionFraction = computed(() => {
  const mission = weeklyMission.value
  if (!mission || mission.daysCompleted <= 0) return null
  return `${mission.daysCompleted}/${mission.daysTarget}`
})

const unansweredHead = computed(() => (crew.value ? 'Crew' : 'Today'))

const answeredHead = computed(() => {
  if (crew.value && crewAllAnswered.value) {
    const days = effectiveCrewStreak.value
    return days >= 2 ? `Crew · Day ${days}` : 'Crew · locked in'
  }
  return 'Checked in'
})

const myCheckinSnippet = computed(() => {
  const raw = (props.myCheckinBody ?? '').trim()
  if (!raw) return null
  return raw.length > 140 ? `${raw.slice(0, 137)}…` : raw
})

const answeredAriaLabel = computed(() => {
  const bits = [answeredHead.value, streakDaysLabel.value, missionFraction.value].filter(Boolean)
  return `${bits.join(' · ')}. View today's check-ins`
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

function onRowNavigate(href: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    if (typeof window !== 'undefined') window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onRowAuxNavigate(href: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  if (typeof window !== 'undefined') window.open(href, '_blank')
}

const crewCb = {
  onStreakAdvanced: (payload: WsCrewStreakAdvancedPayload) => {
    if (!crew.value || crew.value.id !== payload.crewId) return
    localCrewStreak.value = Math.max(0, Number(payload.currentStreakDays ?? 0) || 0)
  },
  onStreakBroken: (payload: WsCrewStreakBrokenPayload) => {
    if (!crew.value || crew.value.id !== payload.crewId) return
    localCrewStreak.value = 0
  },
}

onMounted(() => {
  if (props.verifyCta) return
  addCrewCallback(crewCb)
})

onBeforeUnmount(() => {
  if (props.verifyCta) return
  removeCrewCallback(crewCb)
})

watch(etDayKey, () => {
  localCrewStreak.value = null
})

function handleAnswer() {
  if (answering.value) return
  answering.value = true
  try {
    props.onAnswer?.()
  } finally {
    nextTick(() => {
      answering.value = false
    })
  }
}

function handleLoginToAnswer() {
  props.onLoginToAnswer?.()
}
</script>

<style scoped>
.moh-checkin-row-accent {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: 3px;
  background: var(--moh-checkin);
  pointer-events: none;
}

.moh-checkin-row-cta {
  width: 100%;
  min-height: 44px;
  background: var(--moh-checkin) !important;
  border-color: var(--moh-checkin) !important;
  color: #fff !important;
}

@media (min-width: 640px) {
  .moh-checkin-row-cta {
    width: auto;
  }
}
</style>
