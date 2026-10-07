<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Users"  description="Search and edit users.">
      <template #leading>
        <AppAdminKitMobileBack />
      </template>
    </AppPageHeader>
  <div class="py-4 space-y-4">

    <AppAdminUsersBannedPanel />

    <div class="px-4 flex items-center gap-2">
      <AppAdminKitSearchField
        v-model="userQuery"
        placeholder="Search users by username, name, or phone…"
        @submit="runUserSearch()"
      />
      <Button
        label="Search"
        severity="secondary"
        :loading="searching"
        :disabled="searching"
        @click="runUserSearch()"
      >
        <template #icon>
          <Icon name="tabler:search" aria-hidden="true" />
        </template>
      </Button>
      <Button
        label="Create page"
        severity="secondary"
        @click="openCreatePage"
      />
    </div>

    <div v-if="searchError" class="px-4">
      <AppInlineAlert severity="danger">
        {{ searchError }}
      </AppInlineAlert>
    </div>

    <div v-if="searchedOnce && results.length === 0" class="px-4 text-sm text-gray-600 dark:text-gray-300">
      No users found.
    </div>

    <div v-else class="moh-divide">
      <div
        v-for="u in results"
        :key="u.id"
        role="button"
        tabindex="0"
        class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        @click="onUserRowClick(u)"
        @keydown.enter.prevent="onUserRowClick(u)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <AppUserAvatar
              :user="u"
              size-class="h-10 w-10"
              bg-class="moh-surface"
            />

            <div class="min-w-0">
              <template v-if="u.usernameIsSet && u.username">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="font-semibold truncate">
                    {{ u.name || u.username }}
                  </div>
                  <Tag v-if="u.accountKind === 'page'" value="Page" severity="secondary" class="!text-xs" />
                  <Tag v-if="u.bannedAt" value="Banned" severity="danger" class="!text-xs" />
                  <AppVerifiedBadge
                    :status="u.verifiedStatus"
                    :premium="u.premium"
                    :premium-plus="u.premiumPlus"
                    :is-organization="u.isOrganization"
                  />
                  <AppOrgAffiliationAvatars
                    v-if="!u.isOrganization && u.orgAffiliations && u.orgAffiliations.length > 0"
                    :orgs="u.orgAffiliations"
                    size="xs"
                  />
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                  @{{ u.username }}
                </div>
              </template>
              <template v-else>
                <div class="font-semibold text-gray-900 dark:text-gray-50">
                  Username not set
                </div>
              </template>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <NuxtLink
              v-if="u.usernameIsSet && u.username"
              :to="{ path: '/chat', query: { to: u.username } }"
              class="inline-flex shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-gray-200"
              aria-label="Message user"
              tabindex="0"
              @click.stop
            >
              <Icon name="tabler:message-circle" aria-hidden="true" />
            </NuxtLink>
            <button
              type="button"
              class="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-gray-200"
              aria-label="Edit user"
              @click.stop="openEdit(u)"
            >
              <Icon name="tabler:pencil" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="editOpen"
      modal
      header="Edit user"
      :draggable="false"
      :style="{ width: '34rem' }"
    >
      <div v-if="editingUser" class="space-y-4">
        <AppAdminUsersEditProfile :editing-user="editingUser" />

        <!-- Org affiliations (only for non-org users) -->
        <AppAdminUsersEditOrgAffiliations :editing-user="editingUser" />

        <AppAdminUsersEditPageOperators :editing-user="editingUser" />

        <AppAdminUsersEditMembership />

        <AppAdminUsersEditEmailDetails :editing-user="editingUser" />

        <!-- Free months grant management -->
        <AppAdminUsersEditGrantsBan :editing-user="editingUser" />

        <AppInlineAlert v-if="editError" severity="danger">
          {{ editError }}
        </AppInlineAlert>
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" :disabled="saving" @click="editOpen = false" />
        <Button
          label="Save"
          :loading="saving"
          :disabled="saving || !editingUser || !canSave"
          @click="saveUser()"
        >
          <template #icon>
            <Icon name="tabler:check" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </Dialog>

    <AppAdminUsersCreatePageDialog />
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useAdminUsersPage } from '~/composables/pages/admin/useAdminUsersPage'

definePageMeta({
  layout: 'app',
  title: 'Users',
  middleware: 'admin',
})

const {
  userQuery,
  searching,
  searchedOnce,
  searchError,
  results,
  runUserSearch,
  editOpen,
  editingUser,
  editError,
  openCreatePage,
  canSave,
  openEdit,
  onUserRowClick,
  saveUser,
  saving,
} = useAdminUsersPage()
</script>

