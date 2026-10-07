<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
    <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Email verification</div>

    <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div class="text-xs text-gray-500 dark:text-gray-400">Email</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ editingUser?.email || '—' }}
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Email status</div>
      <div class="text-sm text-gray-800 dark:text-gray-200">
        <Tag
          :value="editingUser?.email ? (editingUser?.emailVerifiedAt ? 'Verified' : 'Unverified') : 'No email'"
          :severity="!editingUser?.email ? 'secondary' : editingUser?.emailVerifiedAt ? 'success' : 'warning'"
          class="!text-xs"
        />
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Email verified at</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ emailVerifiedAtLabel }}
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Verification requested</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ emailVerificationRequestedAtLabel }}
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <Button
        label="Unverify email"
        severity="danger"
        size="small"
        :loading="emailAdminSaving"
        :disabled="emailAdminSaving || !editingUser?.email || !editingUser?.emailVerifiedAt"
        @click="unverifyEmail"
      />
      <div class="text-xs text-gray-600 dark:text-gray-300">
        Marks the email as unverified and invalidates existing verification links.
      </div>
    </div>

    <AppInlineAlert v-if="emailAdminError" class="mt-3" severity="danger">
      {{ emailAdminError }}
    </AppInlineAlert>
  </div>

  <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
    <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">User details</div>
    <div class="mt-2">
      <Button
        v-if="editingUser?.username"
        as="NuxtLink"
        :to="`/u/${encodeURIComponent(editingUser.username)}`"
        label="View public profile"
        size="small"
        severity="secondary"
        outlined
      />
    </div>

    <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div class="text-xs text-gray-500 dark:text-gray-400">User ID</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ editingUser?.id || '—' }}
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Joined</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ joinedAtLabel }}
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Username locked</div>
      <div class="text-sm text-gray-800 dark:text-gray-200">
        <Tag :value="editingUser?.usernameIsSet ? 'Yes' : 'No'" :severity="editingUser?.usernameIsSet ? 'info' : 'secondary'" class="!text-xs" />
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Site admin</div>
      <div class="text-sm text-gray-800 dark:text-gray-200">
        <Tag :value="editingUser?.siteAdmin ? 'Yes' : 'No'" :severity="editingUser?.siteAdmin ? 'success' : 'secondary'" class="!text-xs" />
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Membership</div>
      <div class="text-sm text-gray-800 dark:text-gray-200">
        <Tag :value="membershipLabel" :severity="membershipSeverity" class="!text-xs" />
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Status</div>
      <div class="text-sm text-gray-800 dark:text-gray-200">
        <Tag
          :value="verificationStatusLabel"
          :severity="verificationStatusSeverity"
          class="!text-xs"
        />
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Verified at</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ verificationVerifiedAtLabel }}
      </div>

      <div class="text-xs text-gray-500 dark:text-gray-400">Unverified at</div>
      <div class="text-sm font-mono text-gray-800 dark:text-gray-200">
        {{ verificationUnverifiedAtLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminUsersContext, type AdminUser } from '~/composables/pages/admin/useAdminUsersPage'

defineProps<{ editingUser: AdminUser }>()

const {
  emailVerifiedAtLabel,
  emailVerificationRequestedAtLabel,
  emailAdminSaving,
  unverifyEmail,
  emailAdminError,
  joinedAtLabel,
  membershipLabel,
  membershipSeverity,
  verificationStatusLabel,
  verificationStatusSeverity,
  verificationVerifiedAtLabel,
  verificationUnverifiedAtLabel,
} = useAdminUsersContext()
</script>

