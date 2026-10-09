<template>
  <div class="flex flex-wrap items-end justify-end gap-2 min-h-16 pl-32">
    <div class="flex items-center gap-1.5 min-h-11">
      <AppActionButton
        v-if="isAdminOverride"
        v-tooltip.bottom="tinyTooltip('Edit as site admin')"
        label="Edit"
        kind="outline"
        aria-label="Edit as admin"
        @click="emit('edit')"
      />
      <div
        v-if="showOnlineNow || showLastOnline"
        v-tooltip.bottom="showLastOnline ? tinyTooltip(lastOnlineTooltip) : undefined"
        class="text-xs"
        :class="
          showOnlineNow
            ? 'text-[var(--moh-online)]'
            : 'moh-text-muted tabular-nums'
        "
      >
        <template v-if="showOnlineNow">
          Online now
        </template>
        <template v-else>
          Last online {{ lastOnlineShort }}
        </template>
      </div>
    </div>
      <div v-if="isSelf && !isAdminOverride" class="flex flex-wrap items-center justify-end gap-2">
      <AppActionButton
        label="Edit profile"
        kind="secondary"
        :class="showEditProfileNudge ? ['moh-edit-profile-nudge', editProfileNudgeToneClass] : ''"
        @click="emit('edit')"
      >
        <template #default>
          <AppIconGlyph name="write" class="size-5" aria-hidden="true" />
        Edit profile
        </template>
      </AppActionButton>
      <Button as="NuxtLink" to="/settings" label="Settings" severity="secondary" rounded class="min-h-11" />
      <Button
        v-if="canOpenMenu"
        v-tooltip.bottom="tinyTooltip('More')"
        rounded text severity="secondary"
        class="!h-11 !w-11 !border moh-border"
        aria-label="More"
        aria-haspopup="menu"
        @click="toggleMenu"
      ><Icon name="tabler:dots" class="text-xl" aria-hidden="true" /></Button>
      </div>
    <!-- Visitor actions sit top-right, next to the banner: notifications, more, message, follow. -->
    <div v-if="!isSelf" class="profile-visitor-actions flex flex-wrap items-center justify-end gap-2">
      <Button
        v-if="showPostBell"
        v-tooltip.bottom="tinyTooltip(`Notifications: ${notificationLabel}`)"
        rounded text severity="secondary"
        class="!h-11 !w-11 !border moh-border"
        :aria-label="`Notifications: ${notificationLabel}`"
        aria-haspopup="dialog"
        @click="notificationPreferencesOpen = true"
      ><Icon :name="notificationPreference === 'off' ? 'tabler:bell-off' : notificationPreference === 'all' ? 'tabler:bell-filled' : 'tabler:bell'" class="text-xl" aria-hidden="true" /></Button>
      <Button
        v-if="canOpenMenu"
        v-tooltip.bottom="tinyTooltip('More')"
        rounded text severity="secondary"
        class="!h-11 !w-11 !border moh-border"
        aria-label="More"
        aria-haspopup="menu"
        @click="toggleMenu"
      ><Icon name="tabler:dots" class="text-xl" aria-hidden="true" /></Button>
      <Button
        v-if="showChatButton"
        v-tooltip.bottom="tinyTooltip('Message')"
        rounded text severity="secondary"
        class="!h-11 !w-11 !border moh-border"
        aria-label="Message"
        @click="onChatClick"
      ><Icon name="tabler:message-circle" class="text-xl" aria-hidden="true" /></Button>
      <AppFollowButton
        v-if="isAuthed && profile?.id && !isSelf"
        :user-id="profile.id"
        :username="profile.username"
        :initial-relationship="followRelationship"
        :show-icon="false"
        button-class="!min-h-11"
        @followed="emit('followed')"
        @unfollowed="emit('unfollowed')"
      />
      <Button
        v-else-if="!isAuthed && profile?.id"
        label="Follow"
        rounded
        @click="showAuthActionModal({ kind: 'login', action: 'follow' })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useProfileHeaderContext } from '~/composables/profile/useProfileHeader'

const {
  isAdminOverride,
  emit,
  showOnlineNow,
  showLastOnline,
  lastOnlineShort,
  lastOnlineTooltip,
  isSelf,
  showEditProfileNudge,
  editProfileNudgeToneClass,
  showPostBell,
  notificationLabel,
  notificationPreferencesOpen,
  notificationPreference,
  canOpenMenu,
  toggleMenu,
  showChatButton,
  onChatClick,
  isAuthed,
  profile,
  followRelationship,
  showAuthActionModal,
} = useProfileHeaderContext()
</script>

<style scoped>
.moh-edit-profile-nudge {
  --moh-edit-nudge-color: var(--moh-text);
  border-color: transparent !important;
  border-width: 0 !important;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--moh-edit-nudge-color) 20%, transparent);
  animation: mohEditProfilePulse 3.2s ease-in-out infinite;
}

.moh-edit-profile-nudge--normal {
  --moh-edit-nudge-color: var(--moh-text);
}

.moh-edit-profile-nudge--verified {
  --moh-edit-nudge-color: var(--moh-verified);
}

.moh-edit-profile-nudge--premium {
  --moh-edit-nudge-color: var(--moh-premium);
}

@keyframes mohEditProfilePulse {
  0%,
  100% {
    box-shadow:
      0 0 0 0 color-mix(in srgb, var(--moh-edit-nudge-color) 18%, transparent),
      0 0 0 0 color-mix(in srgb, var(--moh-edit-nudge-color) 10%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 10px color-mix(in srgb, var(--moh-edit-nudge-color) 8%, transparent),
      0 0 0 22px color-mix(in srgb, var(--moh-edit-nudge-color) 4%, transparent);
  }
}
</style>


<style scoped>
.profile-visitor-actions :deep(button) { min-height: 44px; }
</style>
