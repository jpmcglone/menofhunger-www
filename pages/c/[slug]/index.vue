<template>
  <AppPageContent bottom="standard">
    <div v-if="loading" class="flex justify-center py-16">
      <AppLogoLoader />
    </div>

    <div v-else-if="notFound" class="moh-gutter-x pt-10 pb-16 max-w-xl mx-auto text-center space-y-3">
      <Icon name="tabler:shield-off" class="text-3xl opacity-60" aria-hidden="true" />
      <h1 class="moh-h1">Crew not found</h1>
      <p class="text-sm moh-text-muted">
        This Crew may have disbanded or changed its name.
      </p>
      <Button as="NuxtLink" to="/" label="Back home" rounded />
    </div>

    <div v-else-if="crew" class="pb-10">
      <!-- Cover banner -->
      <div class="relative h-40 md:h-56 w-full bg-gray-200 dark:bg-zinc-800">
        <img
          v-if="crew.coverUrl"
          :src="crew.coverUrl"
          alt=""
          class="h-full w-full object-cover"
        >
        <!-- Site-admin edit affordance: small amber pill anchored to the
             banner's bottom-right. Mirrors the profile header pattern so
             "edit as admin" reads the same everywhere. Lives inside the banner
             (vs. profile/groups, where it sits just below) because the crew
             meta wrapper overlaps the area under the banner. -->
        <div
          v-if="isAdminOverride"
          class="absolute inset-x-0 bottom-3 z-10 pointer-events-none"
        >
          <div class="mx-auto max-w-3xl moh-gutter-x flex justify-end">
            <button
              v-tooltip.bottom="tinyTooltip('Edit as site admin')"
              type="button"
              class="pointer-events-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm bg-amber-500/90 text-white hover:bg-amber-500 transition-colors"
              aria-label="Edit as admin"
              @click="editCrewOpen = true"
            >
              <Icon name="tabler:shield" class="text-[10px]" aria-hidden="true" />
              Edit
            </button>
          </div>
        </div>
      </div>

      <!-- Header (avatar + name + tagline + meta + actions) -->
      <div class="moh-gutter-x -mt-16 relative max-w-3xl mx-auto">
        <div class="flex items-end gap-4">
          <div
            class="h-32 w-32 overflow-hidden ring-4 ring-[var(--moh-bg)] bg-gray-200 dark:bg-zinc-800 shrink-0"
            :class="crewAvatarRound"
          >
            <img
              v-if="crew.avatarUrl"
              :src="crew.avatarUrl"
              alt=""
              class="h-full w-full object-cover"
            >
          </div>
          <div class="flex-1 min-w-0 pb-2">
            <h1 class="text-2xl font-semibold moh-text truncate">{{ crewName }}</h1>
            <p v-if="crew.tagline" class="mt-1 text-sm moh-text-muted">{{ crew.tagline }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- Member-only: open the crew chat. Badge mirrors the unread count
                 returned with viewerMembership; clicking optimistically clears it. -->
            <NuxtLink
              v-if="isMember && viewerMembership"
              :to="`/chat?c=${encodeURIComponent(viewerMembership.wallConversationId)}`"
              class="relative rounded-full border moh-border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-900 inline-flex items-center gap-1"
              :aria-label="unreadChatCount > 0 ? `Open crew chat (${unreadChatCount} unread)` : 'Open crew chat'"
              @click="onOpenChat"
            >
              <Icon name="tabler:message-circle" aria-hidden="true" />
              <span>Chat</span>
              <span
                v-if="unreadChatCount > 0"
                class="ml-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums"
                aria-hidden="true"
              >
                <AppAnimatedCount :value="unreadChatCount" :format="(n) => (n > 99 ? '99+' : String(n))" />
              </span>
            </NuxtLink>
            <!-- Owner-only Edit Crew button. Site-admin override uses the amber
                 pill anchored to the banner above (matches profile header pattern). -->
            <Button
              v-if="canEditCrew && !isAdminOverride"
              label="Edit Crew"
              rounded
              size="small"
              severity="secondary"
              @click="editCrewOpen = true"
            >
              <template #icon>
                <Icon name="tabler:edit" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-else-if="isMember"
              label="Leave"
              rounded
              size="small"
              severity="secondary"
              :loading="leaving"
              @click="confirmLeave"
            >
              <template #icon>
                <Icon name="tabler:logout" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <!-- Meta row -->
        <div class="mt-4 text-xs moh-text-muted flex flex-wrap items-center gap-2">
          <Icon name="tabler:users" aria-hidden="true" />
          <NuxtLink
            :to="`/c/${encodeURIComponent(crew.slug)}/members`"
            class="hover:underline tabular-nums"
          >
            {{ crew.memberCount }} {{ crew.memberCount === 1 ? 'member' : 'members' }}
          </NuxtLink>
          <span>·</span>
          <span>Formed {{ formatMonthYear(crew.createdAt) }}</span>
        </div>

        <!-- Bio: shown to everyone who can see the page -->
        <section v-if="crew.bio" class="mt-6 rounded-xl border moh-border p-4">
          <p class="text-sm moh-text whitespace-pre-line">{{ crew.bio }}</p>
        </section>

        <!-- Crew member strip (5 fixed slots) -->
        <section class="mt-6">
          <AppCrewMemberStrip
            v-if="crew.members.length > 0 || isOwner"
            :members="crew.members"
            :pending-invitees="pendingInvitees"
            :is-owner="isOwner"
            :viewer-is-member="isMember"
            :can-add-member="canAddMember"
            @add-member="addMemberOpen = true"
            @member-click="onMemberClick"
            @pending-click="onPendingClick"
          />
        </section>
      </div>

      <!-- Posts feed: edge-to-edge like the home feed, outside the gutter container -->
      <section class="mt-6">
        <div ref="crewFeedTopEl" class="sticky top-[var(--moh-title-bar-height,0px)] z-20 moh-gutter-x py-1.5 border-b moh-border moh-surface flex justify-between items-center mb-3">
          <h2 class="text-sm font-semibold moh-text uppercase tracking-wide">Posts</h2>
          <AppFeedFiltersBar
            :sort="feedSort"
            :filter="feedFilter"
            :viewer-is-verified="viewerIsVerified"
            :viewer-is-premium="viewerIsPremium"
            @update:sort="onCrewFeedSortChange"
            @update:filter="onCrewFeedFilterChange"
          />
        </div>
        <div ref="crewFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

        <AppInlineAlert v-if="feedError" class="moh-gutter-x mb-3" severity="danger">
          {{ feedError }}
        </AppInlineAlert>

        <AppSubtleSectionLoader :loading="feedInitialLoading" :refreshing="feedLoading && !feedInitialLoading" min-height-class="min-h-[200px]">
          <div v-if="!posts.length" class="px-3 py-6 text-sm moh-text-muted text-center">
            No posts from this crew yet.
          </div>
          <div v-else class="relative">
            <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
              <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
              <AppFeedPostRow
                v-else
                :post="item.post"
                collapse-ancestors
                :show-collapsed-replies-footer="feedSort === 'trending'"
                :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                :replies-sort="feedSort"
                @deleted="removePost"
                @edited="onEdited"
              />
            </template>
          </div>
        </AppSubtleSectionLoader>

        <div v-if="nextCursor" class="relative flex justify-center items-center py-6 min-h-12">
          <div ref="loadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
          <div
            class="transition-opacity duration-150"
            :class="loadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!loadingMore"
          >
            <AppLogoLoader compact />
          </div>
        </div>
      </section>
    </div>

    <AppCrewEditCrewDialog
      v-if="crew"
      v-model="editCrewOpen"
      :crew="crew"
      :is-owner="isOwner"
      :is-admin-override="isAdminOverride"
      :target-crew-id="isAdminOverride ? crew.id : null"
      :designated-successor-user-id="viewerMembership?.designatedSuccessorUserId ?? null"
      @updated="onCrewUpdated"
      @disbanded="onCrewDisbanded"
    />

    <AppCrewAddCrewMemberDialog
      v-if="isOwner && crew"
      v-model="addMemberOpen"
      :exclude-user-ids="addMemberExcludeIds"
      @invited="onMemberInvited"
    />

    <AppCrewMemberActionMenu
      :open="memberMenuOpen"
      :target="memberMenuTarget"
      :anchor-el="memberMenuAnchor"
      :viewer-is-owner="isOwner"
      :viewer-user-id="meUser?.id ?? null"
      @update:open="memberMenuOpen = $event"
      @remove-member="onRemoveMemberRequested"
      @cancel-invite="onCancelInviteRequested"
    />

    <AppConfirmDialog
      v-model:visible="removeConfirmOpen"
      :header="removeConfirmHeader"
      :message="removeConfirmMessage"
      confirm-label="Remove"
      confirm-severity="danger"
      :loading="removingMember"
      @confirm="performRemoveMember"
    />
  </AppPageContent>
</template>

<script setup lang="ts">
import { useCrewSlugPage } from '~/composables/pages/crew/useCrewSlugPage'
import { formatMonthYear } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'

definePageMeta({
  layout: 'app',
  title: 'Crew',
  hideTopBar: true,
})

const {
  onMemberClick,
  onPendingClick,
  onRemoveMemberRequested,
  performRemoveMember,
  onCancelInviteRequested,
  onCrewFeedSortChange,
  onCrewFeedFilterChange,
  onEdited,
  onOpenChat,
  onCrewUpdated,
  onMemberInvited,
  onCrewDisbanded,
  confirmLeave,
  crewAvatarRound,
  loading,
  notFound,
  crew,
  viewerMembership,
  crewName,
  isMember,
  isOwner,
  canEditCrew,
  isAdminOverride,
  editCrewOpen,
  addMemberOpen,
  leaving,
  pendingInvitees,
  addMemberExcludeIds,
  memberMenuOpen,
  memberMenuTarget,
  memberMenuAnchor,
  removeConfirmOpen,
  removingMember,
  removeConfirmHeader,
  removeConfirmMessage,
  canAddMember,
  unreadChatCount,
  crewFeedTopEl,
  crewFeedContentEl,
  loadMoreSentinelEl,
  meUser,
  feedSort,
  feedFilter,
  viewerIsVerified,
  viewerIsPremium,
  posts,
  displayItems,
  collapsedSiblingReplyCountFor,
  nextCursor,
  feedLoading,
  feedInitialLoading,
  loadingMore,
  feedError,
  removePost,
} = useCrewSlugPage()
</script>
