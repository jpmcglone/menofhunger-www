<template>
  <div v-if="editingUser && !editingUser.isOrganization" class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Org affiliations</label>
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40 space-y-3">
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Org avatars will appear next to this user's name across the app.
      </div>

      <!-- Loading state -->
      <div v-if="orgAffsLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>

      <!-- Current affiliations -->
      <div v-else-if="orgAffs.length > 0" class="space-y-2">
        <div
          v-for="org in orgAffs"
          :key="org.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div class="flex items-center gap-2 min-w-0">
            <AppUserAvatar :user="{ ...org, isOrganization: true }" size-class="h-7 w-7" />
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ org.name || org.username || 'Unnamed org' }}</div>
              <div v-if="org.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ org.username }}</div>
            </div>
          </div>
          <Button
            severity="danger"
            size="small"
            text
            :loading="orgRemovingId === org.id"
            :disabled="!!orgRemovingId"
            @click="removeOrgAff(org.id)"
          >
            <template #icon>
              <Icon name="tabler:x" />
            </template>
          </Button>
        </div>
      </div>

      <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">No org affiliations.</div>

      <!-- Add org -->
      <div class="flex items-center gap-2">
        <InputText
          v-model="addOrgQuery"
          class="flex-1 text-sm"
          placeholder="Search org by username or name…"
          @keydown.enter.prevent="searchOrgs"
        />
        <Button
          label="Search"
          severity="secondary"
          size="small"
          :loading="orgSearchLoading"
          :disabled="orgSearchLoading || !addOrgQuery.trim()"
          @click="searchOrgs"
        />
      </div>

      <!-- Search results -->
      <div v-if="orgSearchResults.length > 0" class="space-y-1">
        <div
          v-for="r in orgSearchResults"
          :key="r.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div class="flex items-center gap-2 min-w-0">
            <AppUserAvatar :user="{ ...r, isOrganization: true }" size-class="h-7 w-7" />
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ r.name || r.username || 'Unnamed org' }}</div>
              <div v-if="r.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ r.username }}</div>
            </div>
          </div>
          <Button
            label="Add"
            severity="secondary"
            size="small"
            :disabled="orgAffs.some(a => a.id === r.id) || !!orgAddingId"
            :loading="orgAddingId === r.id"
            @click="addOrgAff(r.id)"
          />
        </div>
      </div>

      <AppInlineAlert v-if="orgAffsError" severity="danger">{{ orgAffsError }}</AppInlineAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminUsersContext, type AdminUser } from '~/composables/pages/admin/useAdminUsersPage'

defineProps<{ editingUser: AdminUser }>()

const {
  orgAffsLoading,
  orgAffs,
  orgRemovingId,
  removeOrgAff,
  addOrgQuery,
  searchOrgs,
  orgSearchLoading,
  orgSearchResults,
  orgAddingId,
  addOrgAff,
  orgAffsError,
} = useAdminUsersContext()
</script>

