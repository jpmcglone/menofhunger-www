<template>
  <AppPageContent bottom="standard">
    <AppPageHeader
      sticky
      class="px-4 pt-4 pb-3"
      title="MARV settings"
      
      description="AI helper config, usage, and cost."
    >
      <template #leading>
        <div class="md:hidden">
          <Button
            as="NuxtLink"
            to="/admin"
            text
            severity="secondary"
            aria-label="Back"
          >
            <template #icon>
              <Icon name="tabler:chevron-left" aria-hidden="true" />
            </template>
          </Button>
        </div>
      </template>
      <template #trailing>
        <Button
          text
          severity="secondary"
          :loading="loading"
          aria-label="Refresh"
          @click="loadAll()"
        >
          <template #icon>
            <Icon name="tabler:refresh" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </AppPageHeader>

    <div class="space-y-6 py-4">
      <AppInlineAlert v-if="loadError" severity="danger" :message="loadError" class="mx-4" />

      <!-- Global controls -->
      <section class="px-4 space-y-3">
        <div class="font-semibold text-sm">Global</div>
        <div class="rounded-xl border moh-border p-4 space-y-4">
          <div v-if="!settings" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          <template v-else>
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="font-semibold text-sm">Enabled</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Master switch. When off, every Marv reply is short-circuited
                  (the user gets nothing — public threads silently no-op,
                  private DMs are dropped).
                </div>
              </div>
              <Checkbox
                :model-value="settings.enabled"
                binary
                :disabled="savingEnabled"
                @update:model-value="onToggleEnabled"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t moh-border">
              <div v-for="m in modeKeys" :key="m" class="space-y-1">
                <div class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">{{ marvinModeLabel(m) }}</div>
                <div class="text-sm">
                  Cost:
                  <span class="tabular-nums font-medium">
                    {{ settings[`${m}Cost` as const] ?? defaultCost(m) }}
                  </span>
                  <span v-if="settings[`${m}Cost` as const] === null" class="text-xs text-gray-400 dark:text-gray-500"> (default)</span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Model:
                  <span class="font-mono">
                    {{ settings[`${m}Model` as const] ?? '(default)' }}
                  </span>
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {{ formatDateTime(settings.updatedAt) }}
            </div>
          </template>
        </div>
      </section>

      <!-- Cost rollups -->
      <section class="px-4 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="font-semibold text-sm">Daily cost (last {{ costSinceDays }} days)</div>
            <button
              type="button"
              class="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              :class="loadingCost ? 'animate-spin opacity-60 pointer-events-none' : ''"
              :aria-label="loadingCost ? 'Refreshing…' : 'Refresh cost data'"
              :disabled="loadingCost"
              @click="loadCost"
            >
              <Icon name="tabler:refresh" size="14" aria-hidden="true" />
            </button>
          </div>
          <div class="inline-flex rounded-lg border moh-border overflow-hidden text-xs">
            <button
              v-for="opt in costRangeOptions"
              :key="opt.value"
              class="px-2.5 py-1 font-medium transition-colors"
              :class="costSinceDays === opt.value
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'"
              @click="setCostRange(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div class="rounded-xl border moh-border p-4 space-y-3">
          <div v-if="loadingCost && !costRows.length" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          <div v-else-if="!costRows.length" class="text-sm text-gray-500 dark:text-gray-400 italic">
            No usage data yet. Today's data is always live; historical days roll up nightly at 02:15 UTC.
          </div>
          <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <div class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">Total cost</div>
                <div class="text-2xl font-bold tabular-nums leading-none">${{ totalCostStr }}</div>
              </div>
              <div class="space-y-1">
                <div class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">Requests</div>
                <div class="text-2xl font-bold tabular-nums leading-none">{{ totalRequests.toLocaleString() }}</div>
              </div>
              <div class="space-y-1">
                <div class="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">Credits spent</div>
                <div class="text-2xl font-bold tabular-nums leading-none">{{ totalCredits.toLocaleString() }}</div>
              </div>
            </div>

            <div class="overflow-x-auto -mx-4 px-4">
            <table class="w-full text-sm min-w-[28rem]">
              <thead>
                <tr class="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <th class="py-1 pr-3 font-semibold">Day (UTC)</th>
                  <th class="py-1 pr-3 font-semibold tabular-nums">Requests</th>
                  <th class="py-1 pr-3 font-semibold tabular-nums">Credits</th>
                  <th class="py-1 pr-3 font-semibold tabular-nums">Tokens in</th>
                  <th class="py-1 pr-3 font-semibold tabular-nums">Tokens out</th>
                  <th class="py-1 font-semibold tabular-nums">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in costRowsSortedDesc"
                  :key="row.dayKey"
                  class="border-t moh-border"
                >
                  <td class="py-1 pr-3 font-mono">{{ row.dayKey }}</td>
                  <td class="py-1 pr-3 tabular-nums">{{ row.totalRequests.toLocaleString() }}</td>
                  <td class="py-1 pr-3 tabular-nums">{{ row.totalCreditsSpent.toLocaleString() }}</td>
                  <td class="py-1 pr-3 tabular-nums">{{ row.totalInputTokens.toLocaleString() }}</td>
                  <td class="py-1 pr-3 tabular-nums">{{ row.totalOutputTokens.toLocaleString() }}</td>
                  <td class="py-1 tabular-nums">${{ row.totalCostUsd.toFixed(4) }}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </template>
        </div>
      </section>

      <!-- Users -->
      <section class="px-4 space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="font-semibold text-sm">Users</div>
          <div class="flex items-center gap-2">
            <InputText
              v-model="userQuery"
              class="w-full sm:w-72"
              placeholder="Search username or name…"
              @keydown.enter.prevent="loadUsers()"
            />
            <Button
              label="Search"
              severity="secondary"
              :loading="loadingUsers"
              :disabled="loadingUsers"
              @click="loadUsers()"
            >
              <template #icon><Icon name="tabler:search" aria-hidden="true" /></template>
            </Button>
          </div>
        </div>
        <div class="rounded-xl border moh-border overflow-hidden">
          <div v-if="loadingUsers && !userRows.length" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          <div v-else-if="!userRows.length" class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">No Marv users yet.</div>
          <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-zinc-900/50">
              <tr class="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th class="px-3 py-2 font-semibold">User</th>
                <th class="px-3 py-2 font-semibold">Mode</th>
                <th class="px-3 py-2 font-semibold tabular-nums">Credits</th>
                <th class="px-3 py-2 font-semibold tabular-nums">Spent (30d)</th>
                <th class="px-3 py-2 font-semibold tabular-nums">Events (30d)</th>
                <th class="px-3 py-2 font-semibold">State</th>
                <th class="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in userRows"
                :key="row.userId"
                class="border-t moh-border align-top"
              >
                <td class="px-3 py-2 min-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <NuxtLink
                      :to="row.username ? `/${row.username}` : `/admin/users`"
                      class="font-semibold truncate hover:underline"
                    >
                      @{{ row.username ?? '—' }}
                    </NuxtLink>
                    <Badge v-if="row.isBot" value="bot" severity="secondary" />
                    <Badge
                      v-if="row.premium || row.premiumPlus"
                      :value="row.premiumPlus ? 'premium+' : 'premium'"
                      severity="info"
                    />
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ row.displayName ?? '—' }}</div>
                </td>
                <td class="px-3 py-2">
                  <span class="font-mono">{{ row.preferredMode }}</span>
                </td>
                <td class="px-3 py-2 tabular-nums">{{ row.credits.toLocaleString() }}</td>
                <td class="px-3 py-2 tabular-nums">{{ row.totalCreditsSpent30d.toLocaleString() }}</td>
                <td class="px-3 py-2 tabular-nums">{{ row.totalEvents30d.toLocaleString() }}</td>
                <td class="px-3 py-2">
                  <Badge
                    v-if="row.disabledByAdmin"
                    value="disabled"
                    severity="danger"
                  />
                  <Badge v-else value="active" severity="success" />
                </td>
                <td class="px-3 py-2 text-right">
                  <Button text size="small" severity="secondary" @click="openEditUser(row)">
                    <template #icon><Icon name="tabler:adjustments-horizontal" aria-hidden="true" /></template>
                    Edit
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
        <div v-if="usersNextCursor" class="px-1">
          <Button
            label="Load more"
            text
            severity="secondary"
            :loading="loadingUsersMore"
            :disabled="loadingUsersMore"
            @click="loadMoreUsers()"
          />
        </div>
      </section>
    </div>

    <AppModal v-model="editOpen" title="Edit Marv user">
      <div v-if="editing" class="space-y-4">
        <div class="text-sm">
          <span class="font-semibold">@{{ editing.username ?? editing.userId }}</span>
          <span v-if="editing.displayName" class="text-gray-500 dark:text-gray-400"> · {{ editing.displayName }}</span>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Credits</label>
          <InputNumber
            v-model="editCredits"
            :min="0"
            :max="1000000"
            class="w-full"
            input-class="w-full"
          />
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Current: {{ editing.credits.toLocaleString() }}. Leave unchanged to keep.
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 border-t moh-border pt-3">
          <div>
            <div class="font-semibold text-sm">Disabled</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              When on, Marv won't reply to this user — even if they have credits and premium.
            </div>
          </div>
          <Checkbox v-model="editDisabled" binary />
        </div>

        <AppInlineAlert v-if="editError" severity="danger" :message="editError" />
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button label="Close" severity="secondary" text :disabled="saving" @click="editOpen = false" />
          <Button label="Save" :loading="saving" :disabled="saving" @click="saveEdit()">
            <template #icon><Icon name="tabler:check" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppModal>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useAdminMarvPage } from '~/composables/pages/admin/useAdminMarvPage'
import { formatDateTime } from '~/utils/time-format'
import { marvinModeLabel } from '~/utils/marvin-mode'

definePageMeta({
  layout: 'app',
  title: 'Marv (admin)',
  middleware: 'admin',
})

const {
  defaultCost,
  onToggleEnabled,
  loadCost,
  setCostRange,
  loadUsers,
  openEditUser,
  saveEdit,
  loadAll,
  modeKeys,
  loading,
  loadError,
  settings,
  savingEnabled,
  costRangeOptions,
  costSinceDays,
  loadingCost,
  costRows,
  costRowsSortedDesc,
  totalRequests,
  totalCredits,
  totalCostStr,
  userQuery,
  editOpen,
  editing,
  editCredits,
  editDisabled,
  editError,
  saving,
  userRows,
  usersNextCursor,
  loadingUsers,
  loadingUsersMore,
  loadMoreUsers,
} = useAdminMarvPage()
</script>
