<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
    <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Free months</div>
    <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Set the total banked free months per tier. 0 = no free months. Premium+ is consumed first, then Premium.
    </div>

    <div v-if="grantsLoading" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
    <div v-else class="mt-3 space-y-3">
      <div class="flex items-center gap-3">
        <label class="w-28 text-xs font-medium text-gray-700 dark:text-gray-300">Premium+ months</label>
        <InputNumber
          v-model="editPremiumPlusMonths"
          :min="0"
          :max="1200"
          :allow-empty="false"
          input-class="w-24 text-sm"
          show-buttons
          button-layout="horizontal"
          decrement-button-class="p-button-secondary p-button-sm"
          increment-button-class="p-button-secondary p-button-sm"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="w-28 text-xs font-medium text-gray-700 dark:text-gray-300">Premium months</label>
        <InputNumber
          v-model="editPremiumMonths"
          :min="0"
          :max="1200"
          :allow-empty="false"
          input-class="w-24 text-sm"
          show-buttons
          button-layout="horizontal"
          decrement-button-class="p-button-secondary p-button-sm"
          increment-button-class="p-button-secondary p-button-sm"
        />
      </div>
      <Button
        label="Save free months"
        severity="secondary"
        size="small"
        :loading="grantSaving"
        :disabled="grantSaving"
        @click="saveGrantMonths"
      >
        <template #icon>
          <Icon name="tabler:gift" aria-hidden="true" />
        </template>
      </Button>
    </div>

    <AppInlineAlert v-if="grantError" class="mt-3" severity="danger">{{ grantError }}</AppInlineAlert>
  </div>

  <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
    <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Account ban</div>
    <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div class="text-sm text-gray-700 dark:text-gray-200">
        <Tag
          :value="editingUser?.bannedAt ? 'Banned' : 'Not banned'"
          :severity="editingUser?.bannedAt ? 'danger' : 'secondary'"
          class="!text-xs"
        />
        <span v-if="editingUser?.bannedAt" class="ml-2 text-xs text-gray-600 dark:text-gray-300 font-mono">
          {{ formatDateTime(editingUser?.bannedAt) }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          v-if="editingUser?.bannedAt"
          label="Unban"
          severity="secondary"
          size="small"
          :loading="banSaving"
          :disabled="banSaving"
          @click="unbanEditingUser"
        />
        <Button
          v-else
          label="Ban user"
          severity="danger"
          size="small"
          :loading="banSaving"
          :disabled="banSaving"
          @click="banEditingUser"
        />
      </div>
    </div>

    <div v-if="!editingUser?.bannedAt" class="mt-3 space-y-2">
      <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Reason (optional)
      </label>
      <Textarea v-model="banReason" class="w-full" rows="2" auto-resize :maxlength="500" placeholder="Internal note for admins…" />
    </div>

    <div v-if="editingUser?.bannedReason" class="mt-3 text-xs text-gray-600 dark:text-gray-300">
      Current reason: <span class="font-medium">{{ editingUser.bannedReason }}</span>
    </div>

    <AppInlineAlert v-if="banError" class="mt-3" severity="danger">
      {{ banError }}
    </AppInlineAlert>
  </div>
</template>

<script setup lang="ts">
import type { AdminUser } from '~/composables/pages/admin/useAdminUsersPage'
import { formatDateTime } from '~/utils/time-format'
import { useAdminUsersContext } from '~/composables/pages/admin/useAdminUsersPage'

defineProps<{ editingUser: AdminUser }>()

const {
  grantsLoading,
  editPremiumPlusMonths,
  editPremiumMonths,
  grantSaving,
  saveGrantMonths,
  grantError,
  banSaving,
  unbanEditingUser,
  banEditingUser,
  banReason,
  banError,
} = useAdminUsersContext()
</script>

