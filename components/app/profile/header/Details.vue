<template>
  <div class="flex flex-wrap items-start gap-x-4 gap-y-2 mt-6">
    <div class="min-w-0" style="flex: 1 1 10rem">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <div class="text-2xl font-bold leading-tight moh-text break-words">
          {{ profileName }}
        </div>
        <AppVerifiedBadge
          :status="profile?.verifiedStatus"
          :premium="profile?.premium"
          :premium-plus="profile?.premiumPlus"
          :is-organization="profile?.isOrganization"
          :is-bot="profile?.isBot"
        />
        <AppOrgAffiliationAvatars
          v-if="!profile?.isOrganization && profile?.orgAffiliations && profile.orgAffiliations.length > 0"
          :orgs="profile.orgAffiliations"
          size="sm"
        />
      </div>
      <div class="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <div class="truncate">
          @{{ profile?.username }}
        </div>
        <span
          v-if="relationshipTagLabel"
          class="shrink-0 inline-flex items-center rounded-md bg-gray-200/70 px-2.5 py-1 text-[10px] font-semibold leading-none text-gray-800 dark:bg-zinc-800/80 dark:text-zinc-200"
        >
          {{ relationshipTagLabel }}
        </span>
      </div>
    </div>


  </div>

  <div v-if="profile?.bio" class="mt-4 text-[15px] leading-[1.5] moh-text">
    <AppBioText :text="profile.bio" />
  </div>
  <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
    No bio yet.
  </div>

  <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] moh-text-muted">
    <AppProfileMetadataPreview v-if="locationLabel && locationTo" :url="locationTo" :title="locationLabel" :state-code="locationState ?? undefined">
    <NuxtLink
      :to="locationTo"
      class="inline-flex items-center gap-1.5 min-w-0 text-gray-600 dark:text-gray-300 hover:underline underline-offset-2"
    >
      <ClientOnly>
        <AppStateShape
          v-if="locationState"
          :state="locationState"
          class="h-4 w-4 shrink-0 opacity-80"
        />
        <template #fallback>
          <Icon name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
        </template>
      </ClientOnly>
      <Icon v-if="!locationState" name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
      <span class="truncate">{{ locationLabel }}</span>
    </NuxtLink>
    </AppProfileMetadataPreview>
    <div v-else-if="locationLabel" class="inline-flex items-center gap-1.5 min-w-0 text-gray-600 dark:text-gray-300">
      <ClientOnly>
        <AppStateShape
          v-if="locationState"
          :state="locationState"
          class="h-4 w-4 shrink-0 opacity-80"
        />
        <template #fallback>
          <Icon name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
        </template>
      </ClientOnly>
      <Icon v-if="!locationState" name="tabler:map-pin" class="shrink-0" aria-hidden="true" />
      <span class="truncate">{{ locationLabel }}</span>
    </div>

    <AppProfileMetadataPreview v-for="link in profileLinks" :key="link.key" :url="link.href" :title="link.display" :x-profile-user-id="link.network === 'x' ? profile?.id : undefined">
    <a
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer nofollow"
      class="inline-flex items-center gap-1.5 min-w-0 text-[var(--moh-link)] hover:underline underline-offset-2"
    >
      <AppLinksBrandGlyph :icon="link.icon" size-class="size-4 shrink-0 text-gray-600 dark:text-gray-300" />
      <span class="break-all">{{ link.display }}</span>
    </a>
    </AppProfileMetadataPreview>

    <div v-if="birthdayLabel" class="inline-flex items-center gap-1.5 min-w-0">
      <Icon name="tabler:cake" class="shrink-0" aria-hidden="true" />
      <span class="truncate">Born {{ birthdayLabel }}</span>
    </div>

    <div v-if="joinedLabel" class="inline-flex items-center gap-1.5 min-w-0">
      <AppIconGlyph name="calendar" class="size-4 shrink-0" aria-hidden="true" />
      <span class="truncate">Joined {{ joinedLabel }}</span>
    </div>
  </div>

  <div v-if="showFollowCounts" class="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
    <button type="button" class="cursor-pointer hover:underline" @click="emit('openFollowing')">
      <span class="font-semibold text-gray-900 dark:text-gray-50"><AppAnimatedCount :value="followingCount ?? 0" /></span>
      <span class="ml-1 text-gray-600 dark:text-gray-400">Following</span>
    </button>
    <button type="button" class="cursor-pointer hover:underline" @click="emit('openFollowers')">
      <span class="font-semibold text-gray-900 dark:text-gray-50"><AppAnimatedCount :value="followerCountN" /></span>
      <span class="ml-1 text-gray-600 dark:text-gray-400">{{ followerLabel }}</span>
    </button>
    <button
      v-if="affiliateCount !== null"
      type="button"
      class="cursor-pointer hover:underline"
      @click="emit('openAffiliates')"
    >
      <span class="font-semibold text-gray-900 dark:text-gray-50"><AppAnimatedCount :value="affiliateCount" /></span>
      <span class="ml-1 text-gray-600 dark:text-gray-400">{{ affiliateCount === 1 ? 'Affiliate' : 'Affiliates' }}</span>
    </button>
    <NuxtLink v-if="boardPoints > 0" to="/leaderboard?tab=board" class="hover:underline">
      <span class="font-semibold text-gray-900 dark:text-gray-50"><AppAnimatedCount :value="boardPoints" /></span>
      <span class="ml-1 text-gray-600 dark:text-gray-400">Board {{ boardPoints === 1 ? 'point' : 'points' }}</span>
    </NuxtLink>
  </div>

  <!-- Social proof: people the viewer follows who also follow this profile. -->
  <button
    v-if="followedByLabelText"
    type="button"
    class="mt-3 flex w-full items-center gap-2 text-left text-sm moh-text-muted hover:text-[var(--moh-text)]"
    @click="emit('openFollowers')"
  >
    <AppAvatarFacepile :authors="followedByAuthors" size-class="h-5 w-5" overlap-class="-ml-1.5" />
    <span class="min-w-0 flex-1">{{ followedByLabelText }}</span>
  </button>

  <div class="mt-4 flex flex-wrap items-center gap-2">
  <NuxtLink
    v-if="crewPill"
    :to="`/c/${encodeURIComponent(crewPill.slug)}`"
    class="min-h-11 inline-flex items-center gap-2 rounded-full border moh-border pl-1.5 pr-3 py-1 max-w-full hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
    :aria-label="`View Crew: ${crewPillName}`"
    @mouseenter="onCrewPillEnter"
    @mouseleave="onCrewPillLeave"
  >
    <!-- Crew avatar or fallback shield icon -->
    <span
      class="h-6 w-6 overflow-hidden bg-gray-200 dark:bg-zinc-800 shrink-0 inline-flex items-center justify-center"
      :class="crewAvatarRound"
    >
      <img
        v-if="crewPill.avatarUrl"
        :src="crewPill.avatarUrl"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
      >
      <Icon v-else name="tabler:shield-check" class="text-xs opacity-70" aria-hidden="true" />
    </span>
    <span class="text-xs font-medium moh-text truncate">{{ crewPillName }}</span>
  </NuxtLink>
    <slot name="utilities" />
  </div>
</template>

<script setup lang="ts">
import { useProfileHeaderContext } from '~/composables/profile/useProfileHeader'

const {
  profileName,
  profile,
  relationshipTagLabel,
  locationLabel,
  locationTo,
  locationState,
  profileLinks,
  birthdayLabel,
  joinedLabel,
  showFollowCounts,
  emit,
  followingCount,
  followerCountN,
  followerLabel,
  affiliateCount,
  boardPoints,
  followedByLabelText,
  followedByAuthors,
  crewPill,
  crewPillName,
  onCrewPillEnter,
  onCrewPillLeave,
  crewAvatarRound,
} = useProfileHeaderContext()
</script>

