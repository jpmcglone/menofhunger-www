<template>
  <div class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Verified badge</label>
    <Select
      v-model="editVerifiedStatus"
      :options="verifiedOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Select…"
      class="w-full"
    />
  </div>

  <div class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Feature toggles</label>
    <MultiSelect
      v-model="editFeatureToggles"
      :options="APP_FEATURE_TOGGLE_OPTIONS"
      optionLabel="label"
      optionValue="value"
      display="chip"
      class="w-full"
      placeholder="None enabled"
    />
    <div class="text-xs text-gray-500 dark:text-gray-400">
      Controls app entry points and gated features for this user.
    </div>
  </div>
</template>

<script setup lang="ts">
import { APP_FEATURE_TOGGLE_OPTIONS } from '~/config/app-feature-toggles'
import { useAdminUsersContext } from '~/composables/pages/admin/useAdminUsersPage'

const {
  editVerifiedStatus,
  verifiedOptions,
  editFeatureToggles,
} = useAdminUsersContext()
</script>

