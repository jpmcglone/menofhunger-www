<template>
  <Dialog
    v-model:visible="createPageOpen"
    modal
    header="Create page"
    :draggable="false"
    :style="{ width: '28rem' }"
  >
    <div class="space-y-4">
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
        <InputText v-model="createPageUsername" class="w-full font-mono" placeholder="menofhunger" />
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
        <InputText v-model="createPageName" class="w-full" :maxlength="50" />
      </div>
      <div class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <Checkbox v-model="createPageIsOrg" binary input-id="moh-admin-create-page-org" />
        <label for="moh-admin-create-page-org" class="text-sm font-semibold text-gray-900 dark:text-gray-50">
          Organization page
        </label>
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Operator</label>
        <div class="flex items-center gap-2">
          <InputText
            v-model="createPageOperatorQuery"
            class="flex-1 text-sm"
            placeholder="Search person by username…"
            @keydown.enter.prevent="searchCreatePageOperator"
          />
          <Button
            label="Search"
            severity="secondary"
            size="small"
            :loading="createPageOperatorSearchLoading"
            :disabled="createPageOperatorSearchLoading || !createPageOperatorQuery.trim()"
            @click="searchCreatePageOperator"
          />
        </div>
        <div v-if="createPageOperatorResults.length > 0" class="space-y-1">
          <button
            v-for="r in createPageOperatorResults"
            :key="r.id"
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left dark:bg-zinc-900"
            :class="createPageOperatorId === r.id
              ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40'
              : 'border-gray-200 bg-white dark:border-zinc-700'"
            :disabled="r.accountKind === 'page'"
            @click="createPageOperatorId = r.id"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ r.name || r.username || 'User' }}</div>
              <div v-if="r.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ r.username }}</div>
            </div>
            <Icon v-if="createPageOperatorId === r.id" name="tabler:check" class="text-amber-600" />
          </button>
        </div>
      </div>
      <AppInlineAlert v-if="createPageError" severity="danger">{{ createPageError }}</AppInlineAlert>
    </div>
    <template #footer>
      <Button label="Cancel" text severity="secondary" :disabled="createPageSaving" @click="createPageOpen = false" />
      <Button
        label="Create"
        :loading="createPageSaving"
        :disabled="createPageSaving || !createPageUsername.trim() || !createPageName.trim() || !createPageOperatorId"
        @click="submitCreatePage"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useAdminUsersContext } from '~/composables/pages/admin/useAdminUsersPage'

const {
  createPageOpen,
  createPageSaving,
  createPageUsername,
  createPageName,
  createPageOperatorId,
  submitCreatePage,
  createPageIsOrg,
  createPageOperatorQuery,
  searchCreatePageOperator,
  createPageOperatorSearchLoading,
  createPageOperatorResults,
  createPageError,
} = useAdminUsersContext()
</script>

