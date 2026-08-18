<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Users"  description="Search and edit users.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppPageHeader>
  <div class="py-4 space-y-4">

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
            <InputText
              v-model="bannedQuery"
              class="w-full"
              placeholder="Filter banned users (username, name, email, phone)…"
              @keydown.enter.prevent="refreshBannedUsers"
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

    <div class="px-4 flex items-center gap-2">
      <InputText
        v-model="userQuery"
        class="w-full"
        placeholder="Search users by username, name, or phone…"
        @keydown.enter.prevent="runUserSearch()"
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
            autoResize
            :maxlength="160"
            placeholder="Tell people a bit about yourself…"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Organization account</label>
          <div class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <Checkbox v-model="editIsOrganization" binary inputId="moh-admin-is-org" />
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

        <!-- Org affiliations (only for non-org users) -->
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
                  <img
                    v-if="org.avatarUrl"
                    :src="org.avatarUrl"
                    class="h-7 w-7 rounded-md object-cover flex-shrink-0"
                    alt=""
                  />
                  <div v-else class="h-7 w-7 rounded-md bg-gray-200 dark:bg-zinc-700 flex-shrink-0" />
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
                  <img
                    v-if="r.avatarUrl"
                    :src="r.avatarUrl"
                    class="h-7 w-7 rounded-md object-cover flex-shrink-0"
                    alt=""
                  />
                  <div v-else class="h-7 w-7 rounded-md bg-gray-200 dark:bg-zinc-700 flex-shrink-0" />
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
                Convert this person into a page. Parks their phone for 90 days and assigns an operator.
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

        <!-- Free months grant management -->
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
                :allowEmpty="false"
                inputClass="w-24 text-sm"
                showButtons
                buttonLayout="horizontal"
                decrementButtonClass="p-button-secondary p-button-sm"
                incrementButtonClass="p-button-secondary p-button-sm"
              />
            </div>
            <div class="flex items-center gap-3">
              <label class="w-28 text-xs font-medium text-gray-700 dark:text-gray-300">Premium months</label>
              <InputNumber
                v-model="editPremiumMonths"
                :min="0"
                :max="1200"
                :allowEmpty="false"
                inputClass="w-24 text-sm"
                showButtons
                buttonLayout="horizontal"
                decrementButtonClass="p-button-secondary p-button-sm"
                incrementButtonClass="p-button-secondary p-button-sm"
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
            <Textarea v-model="banReason" class="w-full" rows="2" autoResize :maxlength="500" placeholder="Internal note for admins…" />
          </div>

          <div v-if="editingUser?.bannedReason" class="mt-3 text-xs text-gray-600 dark:text-gray-300">
            Current reason: <span class="font-medium">{{ editingUser.bannedReason }}</span>
          </div>

          <AppInlineAlert v-if="banError" class="mt-3" severity="danger">
            {{ banError }}
          </AppInlineAlert>
        </div>

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
          <Checkbox v-model="createPageIsOrg" binary inputId="moh-admin-create-page-org" />
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
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Users',
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Users',
  description: 'Admin user search and editing.',
  canonicalPath: '/admin/users',
  noindex: true,
})

type AdminUser = {
  id: string
  createdAt: string
  phone: string | null
  accountKind?: 'person' | 'page'
  email: string | null
  emailVerifiedAt: string | null
  emailVerificationRequestedAt: string | null
  username: string | null
  usernameIsSet: boolean
  name: string | null
  bio: string | null
  avatarUrl?: string | null
  siteAdmin: boolean
  featureToggles: string[]
  bannedAt: string | null
  bannedReason: string | null
  bannedByAdminId: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  verifiedAt: string | null
  unverifiedAt: string | null
  orgAffiliations?: OrgAffiliation[]
}

type OrgAffiliation = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
}

type PageOperator = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
}

type OperatedPage = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  accountKind: 'person' | 'page'
  isOrganization: boolean
}

const { apiFetch, apiFetchData } = useApiClient()
import type { AdminGrantSummary } from '~/types/api'
import { APP_FEATURE_TOGGLE_OPTIONS, type AppFeatureToggle } from '~/config/app-feature-toggles'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'

const route = useRoute()
const router = useRouter()

const userQuery = ref('')
const searching = ref(false)
const searchedOnce = ref(false)
const searchError = ref<string | null>(null)
const results = ref<AdminUser[]>([])

async function runUserSearch(opts?: { updateUrl?: boolean }) {
  if (searching.value) return
  searchError.value = null
  searchedOnce.value = true
  searching.value = true

  const q = userQuery.value.trim()

  if (opts?.updateUrl !== false) {
    const query = q ? { q } : undefined
    void router.replace({ path: '/admin/users', query })
  }

  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/search', {
      method: 'GET',
      query: { q, limit: 25 },
    })
    results.value = res.data ?? []
  } catch (e: unknown) {
    searchError.value = getApiErrorMessage(e) || 'Failed to search users.'
  } finally {
    searching.value = false
  }
}

function syncFromUrl() {
  const q = typeof route.query.q === 'string' ? route.query.q : ''
  userQuery.value = q
  void runUserSearch({ updateUrl: false })
}

onMounted(() => {
  syncFromUrl()
})

watch(() => route.query.q, (newQ) => {
  const q = typeof newQ === 'string' ? newQ : ''
  if (q !== userQuery.value.trim()) {
    userQuery.value = q
    void runUserSearch({ updateUrl: false })
  }
})

const editOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const editError = ref<string | null>(null)
const emailAdminError = ref<string | null>(null)
const emailAdminSaving = ref(false)
const banReason = ref('')
const banSaving = ref(false)
const banError = ref<string | null>(null)

// Free month grants state
const grantsLoading = ref(false)
const grantSaving = ref(false)
const grantError = ref<string | null>(null)
const editPremiumMonths = ref(0)
const editPremiumPlusMonths = ref(0)

async function loadGrants(userId: string) {
  grantsLoading.value = true
  grantError.value = null
  try {
    const res = await apiFetchData<AdminGrantSummary>(
      `/admin/users/${encodeURIComponent(userId)}/subscription-grants`,
      { method: 'GET' },
    )
    editPremiumMonths.value = res.premiumMonthsRemaining
    editPremiumPlusMonths.value = res.premiumPlusMonthsRemaining
  } catch (e: unknown) {
    grantError.value = getApiErrorMessage(e) || 'Failed to load grants.'
  } finally {
    grantsLoading.value = false
  }
}

async function saveGrantMonths() {
  const u = editingUser.value
  if (!u || grantSaving.value) return
  grantSaving.value = true
  grantError.value = null
  try {
    const res = await apiFetchData<AdminGrantSummary>(
      `/admin/users/${encodeURIComponent(u.id)}/subscription-grants`,
      {
        method: 'PUT',
        body: {
          premiumMonths: editPremiumMonths.value,
          premiumPlusMonths: editPremiumPlusMonths.value,
        },
      },
    )
    editPremiumMonths.value = res.premiumMonthsRemaining
    editPremiumPlusMonths.value = res.premiumPlusMonthsRemaining
  } catch (e: unknown) {
    grantError.value = getApiErrorMessage(e) || 'Failed to save free months.'
  } finally {
    grantSaving.value = false
  }
}

const bannedOpen = ref(false)
const bannedQuery = ref('')
const bannedUsers = ref<AdminUser[]>([])
const bannedLoading = ref(false)
const bannedError = ref<string | null>(null)
const unbanLoadingId = ref<string | null>(null)

const editPhone = ref('')
const editUsername = ref('')
const editName = ref('')
const editBio = ref('')
const editVerifiedStatus = ref<AdminUser['verifiedStatus']>('none')
const editIsOrganization = ref(false)
const editFeatureToggles = ref<AppFeatureToggle[]>([])

// Org affiliations for the user being edited.
const orgAffs = ref<OrgAffiliation[]>([])
const orgAffsLoading = ref(false)
const orgAffsError = ref<string | null>(null)
const orgRemovingId = ref<string | null>(null)
const orgAddingId = ref<string | null>(null)
const addOrgQuery = ref('')
const orgSearchLoading = ref(false)
const orgSearchResults = ref<OrgAffiliation[]>([])

async function loadOrgAffs(userId: string) {
  orgAffsLoading.value = true
  orgAffsError.value = null
  orgSearchResults.value = []
  addOrgQuery.value = ''
  try {
    const res = await apiFetch<OrgAffiliation[]>(`/admin/users/${encodeURIComponent(userId)}/orgs`, { method: 'GET' })
    orgAffs.value = res.data ?? []
  } catch (e: unknown) {
    orgAffsError.value = getApiErrorMessage(e) || 'Failed to load org affiliations.'
  } finally {
    orgAffsLoading.value = false
  }
}

async function searchOrgs() {
  const q = addOrgQuery.value.trim()
  if (!q || orgSearchLoading.value) return
  orgSearchLoading.value = true
  orgAffsError.value = null
  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/search', {
      method: 'GET',
      query: { q, limit: 10 },
    })
    orgSearchResults.value = (res.data ?? [])
      .filter((u) => u.isOrganization)
      .map((u) => ({ id: u.id, username: u.username, name: u.name, avatarUrl: u.avatarUrl ?? null }))
  } catch (e: unknown) {
    orgAffsError.value = getApiErrorMessage(e) || 'Failed to search orgs.'
  } finally {
    orgSearchLoading.value = false
  }
}

async function addOrgAff(orgId: string) {
  const u = editingUser.value
  if (!u || orgAddingId.value) return
  orgAddingId.value = orgId
  orgAffsError.value = null
  try {
    const added = await apiFetchData<OrgAffiliation>(`/admin/users/${encodeURIComponent(u.id)}/orgs`, {
      method: 'POST',
      body: { orgId },
    })
    if (!orgAffs.value.some((a) => a.id === added.id)) {
      orgAffs.value = [...orgAffs.value, added]
    }
    orgSearchResults.value = orgSearchResults.value.filter((r) => r.id !== orgId)
  } catch (e: unknown) {
    orgAffsError.value = getApiErrorMessage(e) || 'Failed to add org affiliation.'
  } finally {
    orgAddingId.value = null
  }
}

async function removeOrgAff(orgId: string) {
  const u = editingUser.value
  if (!u || orgRemovingId.value) return
  orgRemovingId.value = orgId
  orgAffsError.value = null
  try {
    await apiFetch(`/admin/users/${encodeURIComponent(u.id)}/orgs/${encodeURIComponent(orgId)}`, { method: 'DELETE' })
    orgAffs.value = orgAffs.value.filter((a) => a.id !== orgId)
  } catch (e: unknown) {
    orgAffsError.value = getApiErrorMessage(e) || 'Failed to remove org affiliation.'
  } finally {
    orgRemovingId.value = null
  }
}

const operators = ref<PageOperator[]>([])
const operatorsLoading = ref(false)
const operatorsError = ref<string | null>(null)
const operatorRemovingId = ref<string | null>(null)
const operatorAddingId = ref<string | null>(null)
const operatorQuery = ref('')
const operatorSearchLoading = ref(false)
const operatorSearchResults = ref<AdminUser[]>([])

const operatedPages = ref<OperatedPage[]>([])
const operatedPagesLoading = ref(false)
const convertOperatorQuery = ref('')
const convertOperatorSearchLoading = ref(false)
const convertOperatorResults = ref<AdminUser[]>([])
const convertOperatorId = ref<string | null>(null)
const convertSaving = ref(false)
const convertError = ref<string | null>(null)

const createPageOpen = ref(false)
const createPageUsername = ref('')
const createPageName = ref('')
const createPageIsOrg = ref(false)
const createPageOperatorQuery = ref('')
const createPageOperatorSearchLoading = ref(false)
const createPageOperatorResults = ref<AdminUser[]>([])
const createPageOperatorId = ref<string | null>(null)
const createPageSaving = ref(false)
const createPageError = ref<string | null>(null)

async function loadOperators(userId: string) {
  operatorsLoading.value = true
  operatorsError.value = null
  operatorSearchResults.value = []
  operatorQuery.value = ''
  try {
    const res = await apiFetch<PageOperator[]>(`/admin/users/${encodeURIComponent(userId)}/operators`, { method: 'GET' })
    operators.value = res.data ?? []
  } catch (e: unknown) {
    operatorsError.value = getApiErrorMessage(e) || 'Failed to load operators.'
  } finally {
    operatorsLoading.value = false
  }
}

async function loadOperatedPages(userId: string) {
  operatedPagesLoading.value = true
  convertError.value = null
  convertOperatorResults.value = []
  convertOperatorQuery.value = ''
  try {
    const res = await apiFetch<OperatedPage[]>(`/admin/users/${encodeURIComponent(userId)}/operated-pages`, { method: 'GET' })
    operatedPages.value = res.data ?? []
  } catch (e: unknown) {
    convertError.value = getApiErrorMessage(e) || 'Failed to load pages.'
  } finally {
    operatedPagesLoading.value = false
  }
}

async function searchOperators() {
  const q = operatorQuery.value.trim()
  if (!q || operatorSearchLoading.value) return
  operatorSearchLoading.value = true
  operatorsError.value = null
  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/search', { method: 'GET', query: { q, limit: 10 } })
    operatorSearchResults.value = (res.data ?? []).filter((u) => u.accountKind !== 'page')
  } catch (e: unknown) {
    operatorsError.value = getApiErrorMessage(e) || 'Failed to search operators.'
  } finally {
    operatorSearchLoading.value = false
  }
}

async function addOperator(operatorUserId: string) {
  const u = editingUser.value
  if (!u || operatorAddingId.value) return
  operatorAddingId.value = operatorUserId
  operatorsError.value = null
  try {
    const added = await apiFetchData<PageOperator>(`/admin/users/${encodeURIComponent(u.id)}/operators`, {
      method: 'POST',
      body: { operatorUserId },
    })
    if (!operators.value.some((a) => a.id === added.id)) {
      operators.value = [...operators.value, added]
    }
    operatorSearchResults.value = operatorSearchResults.value.filter((r) => r.id !== operatorUserId)
  } catch (e: unknown) {
    operatorsError.value = getApiErrorMessage(e) || 'Failed to add operator.'
  } finally {
    operatorAddingId.value = null
  }
}

async function removeOperator(operatorUserId: string) {
  const u = editingUser.value
  if (!u || operatorRemovingId.value) return
  operatorRemovingId.value = operatorUserId
  operatorsError.value = null
  try {
    await apiFetch(`/admin/users/${encodeURIComponent(u.id)}/operators/${encodeURIComponent(operatorUserId)}`, {
      method: 'DELETE',
    })
    operators.value = operators.value.filter((a) => a.id !== operatorUserId)
  } catch (e: unknown) {
    operatorsError.value = getApiErrorMessage(e) || 'Failed to remove operator.'
  } finally {
    operatorRemovingId.value = null
  }
}

async function searchConvertOperator() {
  const q = convertOperatorQuery.value.trim()
  if (!q || convertOperatorSearchLoading.value) return
  convertOperatorSearchLoading.value = true
  convertError.value = null
  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/search', { method: 'GET', query: { q, limit: 10 } })
    convertOperatorResults.value = (res.data ?? []).filter((u) => u.accountKind !== 'page')
  } catch (e: unknown) {
    convertError.value = getApiErrorMessage(e) || 'Failed to search operators.'
  } finally {
    convertOperatorSearchLoading.value = false
  }
}

async function convertToPage(operatorUserId: string) {
  const u = editingUser.value
  if (!u || convertSaving.value) return
  convertSaving.value = true
  convertOperatorId.value = operatorUserId
  convertError.value = null
  try {
    await apiFetchData(`/admin/users/${encodeURIComponent(u.id)}/convert-to-page`, {
      method: 'POST',
      body: { operatorUserId },
    })
    editingUser.value = { ...u, accountKind: 'page', phone: null }
    await loadOperators(u.id)
  } catch (e: unknown) {
    convertError.value = getApiErrorMessage(e) || 'Failed to convert to page.'
  } finally {
    convertSaving.value = false
    convertOperatorId.value = null
  }
}

function openCreatePage() {
  createPageUsername.value = ''
  createPageName.value = ''
  createPageIsOrg.value = false
  createPageOperatorQuery.value = ''
  createPageOperatorResults.value = []
  createPageOperatorId.value = null
  createPageError.value = null
  createPageOpen.value = true
}

async function searchCreatePageOperator() {
  const q = createPageOperatorQuery.value.trim()
  if (!q || createPageOperatorSearchLoading.value) return
  createPageOperatorSearchLoading.value = true
  createPageError.value = null
  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/search', { method: 'GET', query: { q, limit: 10 } })
    createPageOperatorResults.value = (res.data ?? []).filter((u) => u.accountKind !== 'page')
  } catch (e: unknown) {
    createPageError.value = getApiErrorMessage(e) || 'Failed to search operators.'
  } finally {
    createPageOperatorSearchLoading.value = false
  }
}

async function submitCreatePage() {
  if (createPageSaving.value || !createPageOperatorId.value) return
  createPageSaving.value = true
  createPageError.value = null
  try {
    const created = await apiFetchData<{ username: string | null }>(
      '/admin/pages',
      {
        method: 'POST',
        body: {
          username: createPageUsername.value.trim(),
          name: createPageName.value.trim(),
          isOrganization: createPageIsOrg.value,
          operatorUserId: createPageOperatorId.value,
        },
      },
    )
    createPageOpen.value = false
    userQuery.value = created.username ?? createPageUsername.value.trim()
    await runUserSearch()
  } catch (e: unknown) {
    createPageError.value = getApiErrorMessage(e) || 'Failed to create page.'
  } finally {
    createPageSaving.value = false
  }
}

type UsernameAvailability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'
const usernameAvailability = ref<UsernameAvailability>('unknown')
const usernameHelperText = ref<string | null>(null)
const usernameHelperToneClass = computed(() => {
  if (usernameAvailability.value === 'available' || usernameAvailability.value === 'same') return 'text-green-700 dark:text-green-300'
  if (usernameAvailability.value === 'taken' || usernameAvailability.value === 'invalid') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

let usernameDebounceTimer: ReturnType<typeof setTimeout> | null = null

function resetUsernameCheck() {
  usernameHelperText.value = null
  usernameAvailability.value = 'unknown'
  if (usernameDebounceTimer) {
    clearTimeout(usernameDebounceTimer)
    usernameDebounceTimer = null
  }
}

async function checkUsernameAvailability(username: string) {
  usernameAvailability.value = 'checking'
  usernameHelperText.value = null
  try {
    const res = await apiFetchData<{ available: boolean; normalized: string | null; error?: string }>('/admin/users/username/available', {
      method: 'GET',
      query: { username },
    })

    if (res.available) {
      usernameAvailability.value = 'available'
      usernameHelperText.value = res.normalized ? `Available: @${res.normalized}` : 'Available.'
    } else {
      usernameAvailability.value = res.error ? 'invalid' : 'taken'
      usernameHelperText.value = res.error || 'That username is taken.'
    }
  } catch (e: unknown) {
    usernameAvailability.value = 'unknown'
    usernameHelperText.value = getApiErrorMessage(e) || 'Failed to check username.'
  }
}

const currentUsernameLower = computed(() => (editingUser.value?.username ?? '').trim().toLowerCase())
const canSave = computed(() => {
  if (!editingUser.value) return false
  const desired = editUsername.value.trim()
  if (!desired) return true // clearing is allowed
  const desiredLower = desired.toLowerCase()
  if (desiredLower && desiredLower === currentUsernameLower.value) return true // unchanged
  return usernameAvailability.value === 'available'
})

watch(
  editUsername,
  (value) => {
    if (!editingUser.value) return

    if (usernameDebounceTimer) clearTimeout(usernameDebounceTimer)
    usernameHelperText.value = null
    usernameAvailability.value = 'unknown'

    const trimmed = value.trim()
    if (!trimmed) return

    const trimmedLower = trimmed.toLowerCase()
    if (trimmedLower === currentUsernameLower.value) {
      usernameAvailability.value = 'same'
      usernameHelperText.value = 'Unchanged.'
      return
    }

    usernameDebounceTimer = setTimeout(() => {
      void checkUsernameAvailability(trimmed)
    }, 500)
  },
  { flush: 'post' }
)

onBeforeUnmount(() => {
  if (usernameDebounceTimer) clearTimeout(usernameDebounceTimer)
})

const verifiedOptions = [
  { label: 'Not verified', value: 'none' as const },
  { label: 'Identity verified', value: 'identity' as const },
  { label: 'Manually verified', value: 'manual' as const },
]

const membershipLabel = computed(() => {
  const u = editingUser.value
  if (!u) return '—'
  if (u.premiumPlus) return 'Premium+'
  if (u.premium) return 'Premium'
  return 'None'
})

const membershipSeverity = computed(() => {
  const u = editingUser.value
  if (!u) return 'secondary'
  if (u.premiumPlus) return 'warning'
  if (u.premium) return 'warning'
  return 'secondary'
})

const verificationStatusLabel = computed(() => {
  const s = editingUser.value?.verifiedStatus
  if (s === 'identity') return 'Identity verified'
  if (s === 'manual') return 'Manually verified'
  return 'Not verified'
})

const verificationStatusSeverity = computed(() => {
  const s = editingUser.value?.verifiedStatus
  if (s === 'identity' || s === 'manual') return 'info'
  return 'secondary'
})

const verificationVerifiedAtLabel = computed(() => formatDateTime(editingUser.value?.verifiedAt))
const verificationUnverifiedAtLabel = computed(() => formatDateTime(editingUser.value?.unverifiedAt))
const joinedAtLabel = computed(() => formatDateTime(editingUser.value?.createdAt))
const emailVerifiedAtLabel = computed(() => formatDateTime(editingUser.value?.emailVerifiedAt))
const emailVerificationRequestedAtLabel = computed(() => formatDateTime(editingUser.value?.emailVerificationRequestedAt))

function openEdit(u: AdminUser) {
  editingUser.value = u
  editError.value = null
  emailAdminError.value = null
  banError.value = null
  grantError.value = null
  banReason.value = ''
  editPremiumMonths.value = 0
  editPremiumPlusMonths.value = 0
  editPhone.value = u.phone ?? ''
  editUsername.value = u.username ?? ''
  editName.value = u.name ?? ''
  editBio.value = u.bio ?? ''
  editVerifiedStatus.value = u.verifiedStatus ?? 'none'
  editIsOrganization.value = Boolean(u.isOrganization)
  editFeatureToggles.value = Array.isArray(u.featureToggles)
    ? u.featureToggles
      .map((value) => String(value ?? '').trim())
      .filter((value): value is AppFeatureToggle => APP_FEATURE_TOGGLE_OPTIONS.some((opt) => opt.value === value))
    : []
  resetUsernameCheck()
  editOpen.value = true
  // Load org affiliations for non-org users.
  if (!u.isOrganization) void loadOrgAffs(u.id)
  else orgAffs.value = []
  if (u.accountKind === 'page') void loadOperators(u.id)
  else void loadOperatedPages(u.id)
  // Load active subscription grants.
  void loadGrants(u.id)
}

function toggleBannedOpen() {
  bannedOpen.value = !bannedOpen.value
  if (bannedOpen.value) void refreshBannedUsers()
}

async function refreshBannedUsers() {
  if (bannedLoading.value) return
  bannedLoading.value = true
  bannedError.value = null
  try {
    const res = await apiFetch<AdminUser[]>('/admin/users/banned', {
      method: 'GET',
      query: { q: bannedQuery.value.trim(), limit: 25 },
    })
    bannedUsers.value = res.data ?? []
  } catch (e: unknown) {
    bannedError.value = getApiErrorMessage(e) || 'Failed to load banned users.'
  } finally {
    bannedLoading.value = false
  }
}

async function unbanUser(u: AdminUser) {
  if (unbanLoadingId.value) return
  const ok = window.confirm(`Unban ${u.username ? `@${u.username}` : 'this user'}?`)
  if (!ok) return
  unbanLoadingId.value = u.id
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/unban`, {
      method: 'POST',
    })
    // remove from banned list
    bannedUsers.value = bannedUsers.value.filter((x) => x.id !== u.id)
    // update search results in-place if present
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    if (editingUser.value?.id === u.id) editingUser.value = updated
  } catch (e: unknown) {
    bannedError.value = getApiErrorMessage(e) || 'Failed to unban user.'
  } finally {
    unbanLoadingId.value = null
  }
}

async function banEditingUser() {
  const u = editingUser.value
  if (!u) return
  if (banSaving.value) return
  const ok = window.confirm(
    `Ban ${u.username ? `@${u.username}` : 'this user'}?\n\nThey will be logged out immediately and will not be able to log in.`,
  )
  if (!ok) return
  banSaving.value = true
  banError.value = null
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/ban`, {
      method: 'POST',
      body: { reason: banReason.value.trim() ? banReason.value.trim() : undefined },
    })
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
    // keep the banned list fresh if it’s open
    if (bannedOpen.value) void refreshBannedUsers()
  } catch (e: unknown) {
    banError.value = getApiErrorMessage(e) || 'Failed to ban user.'
  } finally {
    banSaving.value = false
  }
}

async function unbanEditingUser() {
  const u = editingUser.value
  if (!u) return
  if (banSaving.value) return
  const ok = window.confirm(`Unban ${u.username ? `@${u.username}` : 'this user'}?`)
  if (!ok) return
  banSaving.value = true
  banError.value = null
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/unban`, {
      method: 'POST',
    })
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
    if (bannedOpen.value) void refreshBannedUsers()
  } catch (e: unknown) {
    banError.value = getApiErrorMessage(e) || 'Failed to unban user.'
  } finally {
    banSaving.value = false
  }
}

async function unverifyEmail() {
  const u = editingUser.value
  if (!u) return
  if (!u.email) return
  if (!u.emailVerifiedAt) return
  if (emailAdminSaving.value) return

  // Safety: admins can clear verification, but only the user can re-verify.
  const ok = window.confirm(
    `Unverify ${u.email}?\n\nThis will mark the email as unverified and invalidate existing verification links.\nThe user will need to verify again themselves.`,
  )
  if (!ok) return

  emailAdminSaving.value = true
  emailAdminError.value = null
  try {
    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/email/unverify`, {
      method: 'POST',
    })
    // Update results list in-place.
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
  } catch (e: unknown) {
    emailAdminError.value = getApiErrorMessage(e) || 'Failed to unverify email.'
  } finally {
    emailAdminSaving.value = false
  }
}

function onUserRowClick(u: AdminUser) {
  // Row click: go to admin detail when possible.
  // If username isn't set, we cannot use username route; open edit instead.
  const username = (u.username ?? '').trim()
  if (u.usernameIsSet && username) {
    void navigateTo(`/admin/users/${encodeURIComponent(username)}`)
    return
  }
  openEdit(u)
}

const { submit: saveUser, submitting: saving } = useFormSubmit(
  async () => {
    const u = editingUser.value
    if (!u) return
    editError.value = null

    const updated = await apiFetchData<AdminUser>(`/admin/users/${encodeURIComponent(u.id)}/profile`, {
      method: 'PATCH',
      body: {
        ...(u.accountKind === 'page' ? {} : { phone: editPhone.value.trim() }),
        username: editUsername.value.trim() ? editUsername.value.trim() : null,
        name: editName.value.trim() ? editName.value.trim() : null,
        bio: editBio.value.trim() ? editBio.value.trim() : null,
        isOrganization: editIsOrganization.value,
        verifiedStatus: editVerifiedStatus.value,
        featureToggles: editFeatureToggles.value,
      },
    })

    // Update results list in-place.
    results.value = results.value.map((x) => (x.id === u.id ? updated : x))
    editingUser.value = updated
    editOpen.value = false
  },
  {
    defaultError: 'Failed to save user.',
    onError: (message) => {
      editError.value = message
    },
  },
)
</script>

