<template>
  <div class="overflow-hidden rounded-2xl moh-popover moh-card-matte">
    <!-- Banner: 3:1 with crew cover or gradient fallback -->
    <div class="relative aspect-[3/1] w-full bg-gray-100 dark:bg-zinc-800">
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
        style="background: linear-gradient(135deg, color-mix(in srgb, var(--moh-checkin, #f59e0b) 20%, transparent) 0%, transparent 80%)"
        aria-hidden="true"
      />
    </div>

    <div class="px-4 py-3">
      <!-- Crew name -->
      <NuxtLink
        :to="`/c/${encodeURIComponent(crew.slug)}`"
        class="block font-bold moh-text hover:underline underline-offset-2 truncate"
        @click="pop.close()"
      >
        {{ displayName }}
      </NuxtLink>

      <!-- Tagline / slogan -->
      <p
        v-if="crew.tagline"
        class="mt-0.5 text-sm moh-text-muted line-clamp-2"
      >
        {{ crew.tagline }}
      </p>

      <!-- Member count -->
      <div class="mt-1.5 text-sm">
        <span class="font-semibold moh-text tabular-nums">{{ crew.memberCount.toLocaleString() }}</span>
        <span class="ml-1 moh-text-muted">{{ crew.memberCount === 1 ? 'Member' : 'Members' }}</span>
      </div>

      <!-- Member avatars -->
      <div
        v-if="displayMembers.length"
        class="mt-3 flex -space-x-2"
      >
        <div
          v-for="m in displayMembers"
          :key="m.user.id"
          class="relative rounded-full ring-2 ring-[color:var(--moh-surface-3)]"
          :title="m.user.name ?? m.user.username ?? ''"
        >
          <AppUserAvatar
            :user="m.user"
            size-class="h-8 w-8"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CrewPublic } from '~/types/api'
import { crewDisplayName } from '~/composables/useCrew'

const MAX_PREVIEW_MEMBERS = 5

const props = defineProps<{
  crew: CrewPublic
}>()

const pop = useCrewPreviewPopover()

const displayName = computed(() => crewDisplayName(props.crew))
const displayMembers = computed(() => props.crew.members.slice(0, MAX_PREVIEW_MEMBERS))
</script>
