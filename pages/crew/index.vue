<template>
  <AppPageContent bottom="standard" class="relative">
    <AppRefreshIndicator :loading="loading && !initialLoading" />
    <div class="moh-gutter-x pt-4 pb-10 space-y-6">
      <div class="flex items-center gap-2">
        <h1 class="moh-h1">Your Crew</h1>
        <span class="ml-2 text-xs uppercase tracking-wide moh-text-muted">5 men, max</span>
      </div>

      <div v-if="initialLoading" class="flex justify-center py-16">
        <AppLogoLoader />
      </div>

      <AppInlineAlert v-else-if="error" severity="danger">{{ error }}</AppInlineAlert>

      <!-- Unverified CTA -->
      <div
        v-else-if="!isVerified"
        class="rounded-2xl border moh-border p-6 space-y-3 text-center"
      >
        <Icon name="tabler:shield-check" class="text-3xl opacity-80" aria-hidden="true" />
        <h2 class="text-lg font-semibold moh-text">Crews are for verified men</h2>
        <p class="text-sm moh-text-muted max-w-md mx-auto">
          A Crew is a tight, private group of up to 5 verified men who hold each
          other accountable. Verify to create one or join an invite.
        </p>
        <Button
          as="NuxtLink"
          to="/verification"
          label="Get verified"
          rounded
          class="mt-2"
        />
      </div>

      <!-- No crew: invites inbox + outbox -->
      <div v-else class="space-y-6">
        <div class="rounded-2xl border moh-border p-6 space-y-3 text-center">
          <Icon name="tabler:users" class="text-3xl opacity-80" aria-hidden="true" />
          <h2 class="text-lg font-semibold moh-text">You’re not in a Crew yet</h2>
          <p class="text-sm moh-text-muted max-w-md mx-auto">
            Crews form when a verified man invites another, and the other
            accepts. Invite the man who pushes you hardest.
          </p>
          <div class="flex flex-wrap justify-center gap-2 pt-2">
            <Button
              label="Invite someone"
              rounded
              @click="openInviteDialog = true"
            >
              <template #icon>
                <Icon name="tabler:user-plus" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <!-- Open-to-crew toggle -->
        <div class="rounded-2xl border p-4 flex items-start justify-between gap-4" style="border-color: rgba(var(--moh-checkin-rgb), 0.35); background-color: var(--moh-checkin-soft)">
          <div class="flex-1 min-w-0">
            <div class="font-semibold" style="color: var(--moh-checkin)">Open to joining a crew</div>
            <div class="text-xs moh-text-muted mt-0.5">
              Show up in the directory so other verified men can invite you.
            </div>
          </div>
          <Checkbox
            v-model="openToCrew"
            binary
            :disabled="availabilityLoading"
            aria-label="Open to joining a crew"
            @update:model-value="onAvailabilityToggle"
          />
        </div>

        <!-- Men looking for a crew -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold moh-text uppercase tracking-wide">Men looking for a crew</h3>

          <div v-if="openMembersLoading" class="flex justify-center py-8">
            <AppLogoLoader compact />
          </div>

          <div v-else-if="displayedOpenMembers.length === 0" class="rounded-xl border moh-border moh-surface p-4 text-center text-sm moh-text-muted">
            No one has listed themselves as open yet — be the first.
          </div>

          <div v-else class="moh-divide rounded-xl border moh-border">
            <div
              v-for="entry in displayedOpenMembers"
              :key="entry.user.id"
              class="p-3 flex items-start gap-3"
            >
              <AppUserAvatar :user="entry.user" size-class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <AppUserIdentityLine :user="entry.user" />
                <div v-if="entry.sharedInterests.length > 0" class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="arena in entry.sharedInterests.slice(0, 3)"
                    :key="arena"
                    class="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full moh-surface border moh-border moh-text-muted"
                  >{{ arena }}</span>
                </div>
              </div>
              <span
                v-if="entry.user.id === authUser?.id"
                class="shrink-0 text-[11px] font-medium moh-text-muted self-center"
              >You</span>
              <Button
                v-else
                label="Invite"
                size="small"
                rounded
                class="shrink-0"
                @click="openInviteDialogFor(entry.user)"
              />
            </div>
          </div>
        </section>

        <section v-if="inbox.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold moh-text uppercase tracking-wide">
            Invites received
          </h3>
          <div class="moh-divide rounded-xl border moh-border">
            <div
              v-for="inv in inbox"
              :key="inv.id"
              class="p-3 flex items-start gap-3"
            >
              <AppUserAvatar :user="inv.invitedBy" size-class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <AppUserIdentityLine :user="inv.invitedBy" />
                <div class="mt-0.5 text-xs moh-text-muted">
                  invited you to <span class="font-semibold moh-text">{{ crewLabel(inv) }}</span>
                </div>
                <p v-if="inv.message" class="mt-1 text-xs moh-text-muted line-clamp-3">
                  “{{ inv.message }}”
                </p>
                <div class="mt-1 text-[11px] moh-text-muted">
                  Expires {{ formatFutureRelative(inv.expiresAt) }}
                </div>
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                <Button
                  label="Accept"
                  size="small"
                  rounded
                  :loading="actingInviteId === inv.id"
                  @click="accept(inv)"
                />
                <Button
                  label="Decline"
                  size="small"
                  rounded
                  severity="secondary"
                  :loading="actingInviteId === inv.id"
                  @click="decline(inv)"
                />
              </div>
            </div>
          </div>
        </section>

        <section v-if="outbox.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold moh-text uppercase tracking-wide">
            Invites sent
          </h3>
          <div class="moh-divide rounded-xl border moh-border">
            <div
              v-for="inv in outbox"
              :key="inv.id"
              class="p-3 flex items-start gap-3"
            >
              <AppUserAvatar :user="inv.invitee" size-class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <AppUserIdentityLine :user="inv.invitee" />
                <div class="mt-0.5 text-xs moh-text-muted">Pending invite</div>
                <div class="mt-1 text-[11px] moh-text-muted">
                  Expires {{ formatFutureRelative(inv.expiresAt) }}
                </div>
              </div>
              <Button
                label="Cancel"
                size="small"
                rounded
                severity="secondary"
                :loading="actingInviteId === inv.id"
                @click="cancelOutgoing(inv)"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <Dialog
      v-model:visible="openInviteDialog"
      modal
      header="Invite to Crew"
      :style="{ width: '380px' }"
      :closable="!sendingInvite"
    >
      <div class="space-y-3">
        <p class="text-xs moh-text-muted">
          Search for the verified member you want to invite. The crew will form
          the moment they accept.
        </p>

        <label class="block text-sm font-medium moh-text">
          Crew name <span class="moh-text-muted font-normal">(optional)</span>
        </label>
        <InputText
          v-model="inviteCrewName"
          class="w-full"
          maxlength="80"
          placeholder="e.g. The Hungry Five"
          :disabled="sendingInvite"
        />
        <p class="text-[11px] moh-text-muted -mt-1">
          We'll use this when the crew is created on acceptance.
        </p>

        <label class="block text-sm font-medium moh-text">Member</label>
        <AppUserSearchPicker
          v-model="inviteUser"
          show="all"
          require-verified
          unselectable-hint="Crews are verified-only — this user isn't verified yet."
          placeholder="Search by username or name…"
          :exclude-user-ids="inviteExcludeIds"
          :disabled="sendingInvite"
          autofocus
        />
        <label class="block text-sm font-medium moh-text">Message (optional)</label>
        <Textarea
          v-model="inviteMessage"
          class="w-full min-h-[80px]"
          maxlength="500"
          :disabled="sendingInvite"
        />
        <AppInlineAlert v-if="inviteError" severity="danger">{{ inviteError }}</AppInlineAlert>
      </div>
      <template #footer>
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="sendingInvite"
          @click="openInviteDialog = false"
        />
        <Button
          label="Send invite"
          rounded
          :loading="sendingInvite"
          :disabled="!inviteUser"
          @click="submitInvite"
        />
      </template>
    </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
import { useCrewIndexPage } from '~/composables/crew/useCrewIndexPage'

definePageMeta({
  layout: 'app',
  title: 'Your Crew',
  hideTopBar: true,
})
usePageSeo({
  title: 'Your Crew',
  description: 'Your Crew — up to 5 verified men holding each other accountable.',
  canonicalPath: '/crew',
  noindex: true,
})

const {
  loadOpenMembers,
  onAvailabilityToggle,
  openInviteDialogFor,
  load,
  crewLabel,
  submitInvite,
  accept,
  decline,
  cancelOutgoing,
  router,
  crewApi,
  viewerCrew,
  loading,
  error,
  inbox,
  outbox,
  openInviteDialog,
  inviteUser,
  inviteMessage,
  sendingInvite,
  inviteError,
  inviteCrewName,
  inviteExcludeIds,
  actingInviteId,
  openToCrew,
  availabilityLoading,
  openMembers,
  openMembersLoading,
  viewerEntry,
  displayedOpenMembers,
  crewRealtimeCb,
  initialLoading,
  formatFutureRelative,
  getApiErrorMessage,
  isVerified,
  authUser,
  addCrewCallback,
  removeCrewCallback,
} = useCrewIndexPage()
</script>
