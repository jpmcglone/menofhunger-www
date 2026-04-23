<template>
  <div class="relative overflow-hidden rounded-2xl moh-popover moh-card-matte">
    <!-- Cover image / gradient fallback -->
    <div class="relative aspect-[3/1] w-full moh-surface">
      <img
        v-if="crew.coverUrl"
        :src="crew.coverUrl"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      >
      <div
        v-else
        class="h-full w-full"
        style="background: linear-gradient(135deg, rgba(var(--moh-checkin-rgb, 251 191 36), 0.15) 0%, transparent 80%)"
        aria-hidden="true"
      />
    </div>

    <!-- Avatar -->
    <div class="absolute left-4 bottom-0 translate-y-1/2 z-10">
      <div :class="['ring-4 ring-[color:var(--moh-surface-3)]', CREW_AVATAR_ROUND_CLASS]">
        <div
          class="h-16 w-16 overflow-hidden bg-gray-200 dark:bg-zinc-800 flex items-center justify-center"
          :class="CREW_AVATAR_ROUND_CLASS"
        >
          <img
            v-if="crew.avatarUrl"
            :src="crew.avatarUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <Icon
            v-else
            name="tabler:shield-check"
            class="text-2xl text-amber-500"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 pt-12">
      <!-- Crew name -->
      <NuxtLink
        :to="`/c/${encodeURIComponent(crew.slug)}`"
        class="block font-bold moh-text hover:underline underline-offset-2 truncate"
        @click="pop.close()"
      >
        {{ displayName }}
      </NuxtLink>

      <!-- Tagline -->
      <p
        v-if="crew.tagline"
        class="mt-0.5 text-sm moh-text-muted line-clamp-2"
      >
        {{ crew.tagline }}
      </p>

      <!-- Member count -->
      <div class="mt-2 text-sm">
        <span class="font-semibold moh-text tabular-nums">{{ crew.memberCount.toLocaleString() }}</span>
        <span class="ml-1 moh-text-muted">{{ crew.memberCount === 1 ? 'Member' : 'Members' }}</span>
      </div>

      <!-- Member avatars — the crew-specific feature -->
      <div
        v-if="displayMembers.length"
        class="mt-3 flex items-center gap-2.5"
      >
        <div class="flex -space-x-2 shrink-0">
          <div
            v-for="m in displayMembers"
            :key="m.user.id"
            class="relative rounded-full ring-2 ring-[color:var(--moh-surface-3)]"
            :title="m.user.name ?? m.user.username ?? ''"
          >
            <AppUserAvatar
              :user="m.user"
              size-class="h-7 w-7"
              :enable-preview="false"
            />
            <span
              v-if="m.role === 'owner'"
              class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 ring-1 ring-[color:var(--moh-surface-3)]"
              aria-label="Crew Owner"
            >
              <Icon name="tabler:crown" class="text-[7px] text-white" aria-hidden="true" />
            </span>
          </div>
        </div>
        <p class="text-xs moh-text-muted truncate min-w-0 flex-1">
          {{ memberSummary }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrewPublic } from '~/types/api'
import { CREW_AVATAR_ROUND_CLASS } from '~/utils/avatar-rounding'
import { crewDisplayName } from '~/composables/useCrew'

const MAX_PREVIEW_MEMBERS = 5

const props = defineProps<{
  crew: CrewPublic
}>()

const pop = useCrewPreviewPopover()

const displayName = computed(() => crewDisplayName(props.crew))

const displayMembers = computed(() => props.crew.members.slice(0, MAX_PREVIEW_MEMBERS))

const memberSummary = computed(() => {
  const members = props.crew.members
  if (!members.length) return ''
  const names = members.slice(0, 2).map((m) => m.user.name ?? m.user.username ?? '').filter(Boolean)
  const remaining = Math.max(0, members.length - names.length)
  if (remaining === 0) {
    if (names.length === 1) return names[0]!
    return `${names[0]} & ${names[1]}`
  }
  if (names.length === 1) {
    return `${names[0]} + ${remaining} other${remaining === 1 ? '' : 's'}`
  }
  return `${names[0]}, ${names[1]} + ${remaining} other${remaining === 1 ? '' : 's'}`
})
</script>
