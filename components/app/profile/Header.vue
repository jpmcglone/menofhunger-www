<template>
  <div>
    <!-- Full-bleed profile header (cancel app layout padding) -->
    <AppProfileHeaderBanner />

    <div class="px-5 sm:px-6 pb-6">
      <AppProfileHeaderActions />
      <AppProfileHeaderDetails>
        <template #utilities>
          <slot name="utilities" />
        </template>
      </AppProfileHeaderDetails>
    </div>
  </div>

  <AppProfileUserNotificationPreferences v-if="notificationPreferencesOpen && profile?.username" v-model="notificationPreferencesOpen" :person="{ ...profile, username: profile.username }" />

  <Menu v-if="canOpenMenu" ref="menuRef" :model="menuItems" popup>
    <template #item="{ item, props: itemProps }">
      <a v-bind="itemProps.action" class="flex items-center gap-2" :class="item.class">
        <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
        <span v-bind="itemProps.label">{{ item.label }}</span>
      </a>
    </template>
  </Menu>

  <AppLinksShareLinksPageDialog
    v-if="isSelf && profile?.username"
    v-model="shareLinksOpen"
    :username="profile.username"
    :name="profile.name"
    :bio="profile.bio"
  />

  <!-- Avatar context menu: shown when on own profile and optionally in a space -->
  <Menu ref="avatarMenuRef" :model="avatarMenuItems" popup>
    <template #item="{ item, props: itemProps }">
      <a v-bind="itemProps.action" class="flex items-center gap-2">
        <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
        <span v-bind="itemProps.label">{{ item.label }}</span>
      </a>
    </template>
  </Menu>

  <AppStatusEditorDialog
    :open="statusEditorOpen"
    :draft="statusDraft"
    :active-status="Boolean(activeStatus)"
    :saving="statusSaving"
    :error="statusError"
    title-id="profile-status-editor-title"
    @update:open="(open) => { if (!open) closeStatusEditor() }"
    @update:draft="statusDraft = $event"
    @save="saveStatus($event)"
    @edit="editStatus"
    @clear="clearStatus"
  />

  <AppStatusViewDialog
    v-if="!isSelf && activeStatus"
    :open="statusViewOpen"
    :status-text="activeStatus.text"
    :profile="profile"
    @update:open="statusViewOpen = $event"
  />

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="user"
    :subject-user-id="profile?.id ?? null"
    :subject-label="profile?.username ? `@${profile.username}` : 'User'"
    @submitted="onReportSubmitted"
  />


  <AppCrewInviteToCrewDialog
    v-if="canInviteToCrew"
    v-model="inviteToCrewOpen"
    :invitee-user-id="inviteToCrewUserId"
    :invitee-name="profile?.name || profile?.username || null"
  />

  <AppConfirmDialog
    :visible="startChatInfoVisible"
    header="Can't start this chat"
    message="You can only message people who follow you back. Upgrade to Premium to message any member."
    cancel-label="Not now"
    confirm-label="Get Premium"
    confirm-severity="primary"
    @update:visible="startChatInfoVisible = $event"
    @confirm="goBilling"
    @cancel="startChatInfoVisible = false"
  >
    <template #extra-actions>
      <button
        type="button"
        class="moh-tap moh-focus rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:moh-text transition-colors"
        @click="goPremium"
      >
        View tiers
      </button>
    </template>
  </AppConfirmDialog>
</template>

<script setup lang="ts">
import type { ProfileHeaderProps, ProfileHeaderEmits } from '../../../composables/profile/profile-header-types'
import { useProfileHeader } from '~/composables/profile/useProfileHeader'

const props = defineProps<ProfileHeaderProps>()

const emit = defineEmits<ProfileHeaderEmits>()

const {
  profile,
  isSelf,
  notificationPreferencesOpen,
  startChatInfoVisible,
  goPremium,
  goBilling,
  canOpenMenu,
  shareLinksOpen,
  reportOpen,
  menuRef,
  avatarMenuRef,
  avatarMenuItems,
  inviteToCrewOpen,
  inviteToCrewUserId,
  canInviteToCrew,
  menuItems,
  onReportSubmitted,
  statusEditorOpen,
  statusViewOpen,
  statusDraft,
  statusSaving,
  statusError,
  activeStatus,
  closeStatusEditor,
  saveStatus,
  editStatus,
  clearStatus,
} = useProfileHeader(props, emit)

</script>
