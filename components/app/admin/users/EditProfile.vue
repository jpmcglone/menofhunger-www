<template>
  <div v-if="editingUser.accountKind !== 'page'" class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Phone</label>
    <InputText v-model="editPhone" class="w-full font-mono" placeholder="+15551234567" />
  </div>
  <div v-else class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-gray-300">
    Page account — no phone.
  </div>

  <div class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
    <div class="flex items-center gap-2">
      <InputText v-model="editUsername" class="w-full font-mono" placeholder="username" />
      <div class="shrink-0 w-8 flex items-center justify-center">
        <AppLogoLoader v-if="usernameAvailability === 'checking'" :size="24" class="shrink-0" />
        <Icon
          v-else-if="usernameAvailability === 'available' || usernameAvailability === 'same'"
          name="tabler:check"
          class="text-green-600"
          aria-hidden="true"
        />
        <Icon
          v-else-if="usernameAvailability === 'taken' || usernameAvailability === 'invalid'"
          name="tabler:x"
          class="text-red-600"
          aria-hidden="true"
        />
      </div>
    </div>
    <div v-if="usernameHelperText" class="text-sm" :class="usernameHelperToneClass">
      {{ usernameHelperText }}
    </div>
    <div class="text-xs text-gray-500 dark:text-gray-400">
      Leave blank to clear username.
    </div>
  </div>

  <div class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
    <InputText v-model="editName" class="w-full" :maxlength="50" />
  </div>

  <div class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
    <Textarea
      v-model="editBio"
      class="w-full"
      rows="4"
      auto-resize
      :maxlength="160"
      placeholder="Tell people a bit about yourself…"
    />
  </div>

  <div class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Organization account</label>
    <div class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <Checkbox v-model="editIsOrganization" binary input-id="moh-admin-is-org" />
      <div class="min-w-0">
        <label for="moh-admin-is-org" class="block text-sm font-semibold text-gray-900 dark:text-gray-50">
          Organization account
        </label>
        <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
          Shows an Organization badge and a squircle avatar in clients.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminUsersContext, type AdminUser } from '~/composables/pages/admin/useAdminUsersPage'

defineProps<{ editingUser: AdminUser }>()

const {
  editPhone,
  editUsername,
  usernameAvailability,
  usernameHelperText,
  usernameHelperToneClass,
  editName,
  editBio,
  editIsOrganization,
} = useAdminUsersContext()
</script>

