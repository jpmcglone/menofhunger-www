<template>
  <div v-if="editingUser.accountKind === 'page'" class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Operators</label>
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40 space-y-3">
      <div class="text-xs text-gray-500 dark:text-gray-400">
        People who can switch into this page.
      </div>
      <div v-if="operatorsLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      <div v-else-if="operators.length > 0" class="space-y-2">
        <div
          v-for="op in operators"
          :key="op.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ op.name || op.username || 'Operator' }}</div>
            <div v-if="op.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ op.username }}</div>
          </div>
          <Button
            severity="danger"
            size="small"
            text
            :loading="operatorRemovingId === op.id"
            :disabled="!!operatorRemovingId"
            @click="removeOperator(op.id)"
          >
            <template #icon>
              <Icon name="tabler:x" />
            </template>
          </Button>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">No operators.</div>
      <div class="flex items-center gap-2">
        <InputText
          v-model="operatorQuery"
          class="flex-1 text-sm"
          placeholder="Search person by username…"
          @keydown.enter.prevent="searchOperators"
        />
        <Button
          label="Search"
          severity="secondary"
          size="small"
          :loading="operatorSearchLoading"
          :disabled="operatorSearchLoading || !operatorQuery.trim()"
          @click="searchOperators"
        />
      </div>
      <div v-if="operatorSearchResults.length > 0" class="space-y-1">
        <div
          v-for="r in operatorSearchResults"
          :key="r.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ r.name || r.username || 'User' }}</div>
            <div v-if="r.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ r.username }}</div>
          </div>
          <Button
            label="Add"
            severity="secondary"
            size="small"
            :disabled="operators.some((a) => a.id === r.id) || !!operatorAddingId || r.accountKind === 'page'"
            :loading="operatorAddingId === r.id"
            @click="addOperator(r.id)"
          />
        </div>
      </div>
      <AppInlineAlert v-if="operatorsError" severity="danger">{{ operatorsError }}</AppInlineAlert>
    </div>
  </div>

  <div v-else class="space-y-2">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Pages</label>
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40 space-y-3">
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Pages this person can switch into.
      </div>
      <div v-if="operatedPagesLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      <div v-else-if="operatedPages.length > 0" class="space-y-2">
        <div
          v-for="page in operatedPages"
          :key="page.id"
          class="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div class="text-sm font-medium truncate">{{ page.name || page.username || 'Page' }}</div>
          <div v-if="page.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ page.username }}</div>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">No pages.</div>

      <div v-if="!editingUser.siteAdmin" class="space-y-2 border-t border-gray-200 pt-3 dark:border-zinc-800">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Convert this person into a page. Removes its phone and assigns an operator.
        </div>
        <div class="flex items-center gap-2">
          <InputText
            v-model="convertOperatorQuery"
            class="flex-1 text-sm"
            placeholder="Operator username…"
            @keydown.enter.prevent="searchConvertOperator"
          />
          <Button
            label="Search"
            severity="secondary"
            size="small"
            :loading="convertOperatorSearchLoading"
            :disabled="convertOperatorSearchLoading || !convertOperatorQuery.trim()"
            @click="searchConvertOperator"
          />
        </div>
        <div v-if="convertOperatorResults.length > 0" class="space-y-1">
          <div
            v-for="r in convertOperatorResults"
            :key="r.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ r.name || r.username || 'User' }}</div>
              <div v-if="r.username" class="text-xs text-gray-500 dark:text-gray-400">@{{ r.username }}</div>
            </div>
            <Button
              label="Convert"
              severity="danger"
              size="small"
              :disabled="r.id === editingUser.id || r.accountKind === 'page' || convertSaving"
              :loading="convertSaving && convertOperatorId === r.id"
              @click="convertToPage(r.id)"
            />
          </div>
        </div>
        <AppInlineAlert v-if="convertError" severity="danger">{{ convertError }}</AppInlineAlert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminUsersContext, type AdminUser } from '~/composables/pages/admin/useAdminUsersPage'

defineProps<{ editingUser: AdminUser }>()

const {
  operatorsLoading,
  operators,
  operatorRemovingId,
  removeOperator,
  operatorQuery,
  searchOperators,
  operatorSearchLoading,
  operatorSearchResults,
  operatorAddingId,
  addOperator,
  operatorsError,
  operatedPagesLoading,
  operatedPages,
  convertOperatorQuery,
  searchConvertOperator,
  convertOperatorSearchLoading,
  convertOperatorResults,
  convertSaving,
  convertOperatorId,
  convertToPage,
  convertError,
} = useAdminUsersContext()
</script>

