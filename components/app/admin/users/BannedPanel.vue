<template>
  <div class="px-4">
    <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Banned users</div>
          <div class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            Site admins can unban accounts here.
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            :label="bannedOpen ? 'Hide' : 'Show'"
            severity="secondary"
            size="small"
            :loading="bannedLoading"
            :disabled="bannedLoading"
            @click="toggleBannedOpen"
          />
          <Button
            label="Refresh"
            severity="secondary"
            size="small"
            :loading="bannedLoading"
            :disabled="bannedLoading || !bannedOpen"
            @click="refreshBannedUsers"
          >
            <template #icon>
              <Icon name="tabler:refresh" aria-hidden="true" />
            </template>
          </Button>
        </div>
      </div>

      <div v-if="bannedOpen" class="mt-4 space-y-3">
        <div class="flex items-center gap-2">
          <AppAdminKitSearchField
            v-model="bannedQuery"
            placeholder="Filter banned users (username, name, email, phone)…"
            @submit="refreshBannedUsers"
          />
          <Button
            label="Filter"
            severity="secondary"
            :loading="bannedLoading"
            :disabled="bannedLoading"
            @click="refreshBannedUsers"
          />
        </div>

        <AppInlineAlert v-if="bannedError" severity="danger">{{ bannedError }}</AppInlineAlert>

        <div v-if="!bannedLoading && bannedUsers.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
          No banned users.
        </div>

        <div v-else class="moh-divide rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div v-for="u in bannedUsers" :key="u.id" class="bg-white/60 dark:bg-zinc-950/20 px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <AppUserAvatar :user="u" size-class="h-9 w-9" bg-class="moh-surface" />
                <div class="min-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="font-semibold truncate">
                      {{ u.name || u.username || 'User' }}
                    </div>
                    <Tag value="Banned" severity="danger" class="!text-xs" />
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                    <span v-if="u.username">@{{ u.username }}</span>
                    <span v-else class="italic">username not set</span>
                  </div>
                  <div v-if="u.bannedReason" class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Reason: <span class="font-medium">{{ u.bannedReason }}</span>
                  </div>
                  <div v-if="u.bannedAt" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    Banned at: {{ formatDateTime(u.bannedAt) }}
                  </div>
                </div>
              </div>

              <Button
                label="Unban"
                severity="secondary"
                size="small"
                :loading="unbanLoadingId === u.id"
                :disabled="Boolean(unbanLoadingId)"
                @click="unbanUser(u)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '~/utils/time-format'
import { useAdminUsersContext } from '~/composables/pages/admin/useAdminUsersPage'

const {
  bannedOpen,
  bannedLoading,
  toggleBannedOpen,
  refreshBannedUsers,
  bannedQuery,
  bannedError,
  bannedUsers,
  unbanLoadingId,
  unbanUser,
} = useAdminUsersContext()
</script>

