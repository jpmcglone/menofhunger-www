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
          :is-bot="isBot"
        />
      </NuxtLink>
      <AppVerifiedBadge
        v-else
        class="shrink-0"
        :status="verifiedStatus"
        :premium="premium"
        :premium-plus="premiumPlus"
        :is-organization="isOrganization"
        :is-bot="isBot"
      />

      <AppOrgAffiliationAvatars
        v-if="orgAffiliations && orgAffiliations.length > 0"
        :orgs="orgAffiliations"
        size="xs"
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
      </NuxtLink>
      <a
        v-if="pickaxUrl"
        v-tooltip.bottom="tinyTooltip('Also on Pickax')"
        :href="pickaxUrl"
        target="_blank"
        rel="noopener nofollow"
        class="ml-1 inline-flex shrink-0 items-center"
        aria-label="View this post on Pickax"
        @click.stop
      >
        <img
          src="/images/brands/pickax.png"
          alt=""
          width="14"
          height="14"
          class="h-3.5 w-3.5 rounded-[3px] opacity-70 transition-opacity hover:opacity-100"
        >
      </a>
      <a
        v-if="xUrl"
        v-tooltip.bottom="tinyTooltip('Also on X')"
        :href="xUrl"
        target="_blank"
        rel="noopener nofollow"
        class="ml-1 inline-flex shrink-0 items-center text-[var(--moh-text-muted)] opacity-70 transition-opacity hover:opacity-100"
        aria-label="View this post on X"
        @click.stop
      >
        <Icon name="tabler:brand-x" class="h-3.5 w-3.5" />
      </a>
      <span
        v-if="isEdited"
        class="ml-1 shrink-0 text-[11px] font-normal text-gray-400 dark:text-gray-500"
        aria-label="Edited"
      >
        (edited)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
type VerifiedStatus = 'none' | 'identity' | 'manual'
type OrgAffiliation = { id: string; username: string | null; name: string | null; avatarUrl: string | null; avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null }

const props = defineProps<{
  displayName: string
  username: string
  verifiedStatus?: VerifiedStatus | null
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  orgAffiliations?: OrgAffiliation[] | null
  isBot?: boolean
  editedAt?: string | null
  /** Public Pickax permalink; renders a small logo link out to the cross-posted copy. */
  pickaxUrl?: string | null
  /** Public X status URL; renders a small X mark linking to the cross-posted copy. */
  xUrl?: string | null
  /** Hide the inline "edited" marker (e.g. for onlyMe notes/drafts). */
  hideEditedBadge?: boolean
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
const isEdited = computed(() => Boolean(props.editedAt) && !props.hideEditedBadge)

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({ username })
</script>
