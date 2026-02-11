<template>
  <!-- Single-line, X-style: Name (badge) @username · date -->
  <div class="flex min-w-0 items-baseline gap-2 leading-[1.15] flex-nowrap">
    <div class="flex min-w-0 items-center gap-1.5 flex-nowrap">
      <NuxtLink
        v-if="profilePath"
        :to="profilePath"
        class="min-w-0 truncate font-bold moh-text hover:underline underline-offset-2"
        :aria-label="`View @${username} profile`"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        {{ displayName }}
      </NuxtLink>
      <span
        v-else
        class="min-w-0 truncate font-bold moh-text"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        {{ displayName }}
      </span>

      <NuxtLink
        v-if="profilePath"
        :to="profilePath"
        class="inline-flex shrink-0 items-center"
        aria-label="View profile (verified badge)"
      >
        <AppVerifiedBadge
          :status="verifiedStatus"
          :premium="premium"
          :premium-plus="premiumPlus"
          :is-organization="isOrganization"
          :steward-badge-enabled="stewardBadgeEnabled"
        />
      </NuxtLink>
      <AppVerifiedBadge
        v-else
        class="shrink-0"
        :status="verifiedStatus"
        :premium="premium"
        :premium-plus="premiumPlus"
        :is-organization="isOrganization"
        :steward-badge-enabled="stewardBadgeEnabled"
      />
    </div>

    <div class="moh-meta flex min-w-0 items-baseline gap-1.5 flex-nowrap font-light">
      <NuxtLink
        v-if="profilePath"
        :to="profilePath"
        class="min-w-0 truncate hover:underline underline-offset-2"
        :aria-label="`View @${username} profile`"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        @{{ username || '—' }}
      </NuxtLink>
      <span
        v-else
        class="min-w-0 truncate"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        @{{ username || '—' }}
      </span>

      <span class="shrink-0 text-base leading-none" aria-hidden="true">·</span>
      <NuxtLink
        :to="postPermalink"
        class="shrink-0 whitespace-nowrap hover:underline underline-offset-2"
        :aria-label="`View post ${postId}`"
        v-tooltip.bottom="createdAtTooltip"
      >
        {{ createdAtShort }}
        <span
          v-if="isEdited"
          class="ml-1 text-[11px] font-semibold opacity-80"
          aria-label="Edited"
        >
          edited
        </span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
type VerifiedStatus = 'none' | 'identity' | 'manual'

const props = defineProps<{
  displayName: string
  username: string
  verifiedStatus?: VerifiedStatus | null
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  stewardBadgeEnabled?: boolean
  editedAt?: string | null
  profilePath: string | null
  postId: string
  postPermalink: string
  createdAtShort: string
  // PrimeVue tooltip directive accepts `null` or a config object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAtTooltip: any
}>()

const displayName = computed(() => props.displayName || props.username || 'User')
const username = computed(() => props.username || '')
const stewardBadgeEnabled = computed(() => props.stewardBadgeEnabled ?? true)
const isEdited = computed(() => Boolean(props.editedAt))

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({ username })
</script>

