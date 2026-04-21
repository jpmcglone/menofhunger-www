<template>
  <AppPageContent class="h-full min-h-0" bottom="standard">
    <div class="grid h-full min-h-0" :class="isTinyViewport ? 'grid-cols-1' : ''" :style="gridStyle">
      <!-- Left column: section list -->
      <section
        v-if="showListPane"
        :class="[
          'h-full overflow-y-auto moh-scrollbar-stable border-b border-gray-200 dark:border-zinc-800',
          !isTinyViewport ? 'border-b-0 border-r' : ''
        ]"
      >
        <div class="py-3 sm:py-4">
          <div class="px-3 sm:px-4 text-base sm:text-lg font-semibold">Settings</div>

          <div class="mt-3 px-3 sm:px-4">
            <InputText
              v-model="sectionQuery"
              id="settings-search"
              name="q"
              aria-label="Search settings"
              class="w-full h-11 !rounded-full"
              placeholder="Search settings…"
            />
          </div>

          <div class="mt-4 divide-y divide-gray-200 dark:divide-zinc-800">
            <NuxtLink
              v-for="s in filteredSections"
              :key="s.key"
              :to="`/settings/${s.key}`"
              :class="sectionRowClass(s.key)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold truncate text-gray-900 dark:text-gray-50">{{ s.label }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ s.description }}</div>
                </div>
                <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Right column: selected section -->
      <section v-if="showDetailPane" :class="['h-full overflow-hidden', !isTinyViewport ? 'pl-4' : '']">
        <div class="flex h-full flex-col">
          <div class="border-b border-gray-200 py-2.5 sm:py-3 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-start gap-2">
                <Button
                  v-if="selectedSection"
                  as="NuxtLink"
                  to="/settings"
                  text
                  severity="secondary"
                  aria-label="Back"
                >
                  <template #icon>
                    <Icon name="tabler:chevron-left" aria-hidden="true" />
                  </template>
                </Button>
                <div class="min-w-0">
                  <div class="font-semibold truncate">
                    {{ selectedSectionLabel }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ selectedSectionDescription }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto moh-scrollbar-stable pt-3 sm:pt-4 pb-0 sm:pb-4">
            <div class="px-3 sm:px-4 min-h-[20rem]">
              <div v-if="showsBlock('account')" class="space-y-6">
                <AppUsernameField
                  v-model="usernameInput"
                  :status="usernameStatus"
                  :helper-text="usernameHelperText"
                  :disabled="saving"
                  placeholder="your_handle"
                >
                  <template #label>
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
                  </template>
                </AppUsernameField>

                <div class="flex items-center gap-3">
                  <AppSaveButton :loading="saving" :disabled="!canSaveUsername" @click="save" />
                  <div v-if="saved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                </div>

                <div
                  v-if="route.query.email_verified === '1'"
                  class="rounded-lg border moh-border p-2 text-sm text-green-800 dark:text-green-200 moh-surface"
                >
                  Email verified.
                </div>
                <div
                  v-else-if="route.query.email_verified === '0'"
                  class="rounded-lg border moh-border p-2 text-sm text-red-800 dark:text-red-200 moh-surface"
                >
                  Email verification link is invalid or expired.
                </div>

                <AppFormField
                  label="Email"
                  optional
                  :helper="emailHelperText ?? (emailSaved ? 'Saved.' : undefined)"
                  :helper-tone="emailSaved ? 'success' : emailHelperText ? 'error' : 'default'"
                >
                  <InputText
                    v-model="emailInput"
                    class="w-full"
                    placeholder="you@example.com"
                    autocomplete="email"
                    :disabled="emailSaving"
                  />
                </AppFormField>
                <div class="flex items-center gap-3">
                  <AppSaveButton label="Save email" severity="secondary" :loading="emailSaving" :disabled="!emailDirty" @click="saveEmail" />
                  <div v-if="emailResendSaved" class="text-sm text-green-700 dark:text-green-300">Verification email sent.</div>
                </div>

                <div v-if="authUser?.email" class="flex flex-wrap items-center gap-3 text-sm">
                  <Tag
                    :value="authUser.emailVerifiedAt ? 'Email verified' : 'Email unverified'"
                    :severity="authUser.emailVerifiedAt ? 'success' : 'warning'"
                    class="!text-xs"
                  />
                  <div v-if="!authUser.emailVerifiedAt" class="moh-text-muted">
                    Please verify your email to receive the daily digest.
                  </div>
                  <Button
                    v-if="!authUser.emailVerifiedAt && emailVerificationUiReady"
                    :label="emailResendButtonLabel"
                    size="small"
                    severity="secondary"
                    class="tabular-nums"
                    :loading="emailResendSaving"
                    :disabled="emailResendSaving || emailResendCooldownActive"
                    @click="resendEmailVerification"
                  />
                  <div v-if="emailResendError" class="text-red-700 dark:text-red-300">{{ emailResendError }}</div>
                </div>

                <div class="space-y-3">
                  <AppFormField
                    label="Location"
                    optional
                    helper="Zipcode, city, or city/state. We normalize this to your profile location."
                  >
                    <InputText
                      v-model="locationQueryInput"
                      class="w-full"
                      placeholder="e.g. Roanoke, VA or 24011"
                      :disabled="profileDetailsSaving"
                    />
                  </AppFormField>

                  <AppFormField
                    label="Website"
                    optional
                    :helper="'Include full URL, e.g. https://example.com'"
                  >
                    <InputText
                      v-model="websiteInput"
                      class="w-full"
                      placeholder="https://your-site.com"
                      inputmode="url"
                      :disabled="profileDetailsSaving"
                    />
                  </AppFormField>

                  <div class="flex items-center gap-3">
                    <AppSaveButton label="Save profile details" severity="secondary" :loading="profileDetailsSaving" :disabled="!profileDetailsDirty" @click="saveProfileDetails" />
                    <div v-if="profileDetailsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                  </div>
                  <div v-if="profileDetailsHelperText" class="text-sm text-red-700 dark:text-red-300">
                    {{ profileDetailsHelperText }}
                  </div>
                </div>

                <div class="space-y-3">
                  <AppInterestsPicker
                    v-model="interestsInput"
                    :disabled="interestsSaving"
                    label="Interests"
                    helper-right="Pick at least 1"
                    helper-bottom="Used for discovery and recommendations."
                    description="Search, pick from suggestions, or add your own."
                  />
                  <div class="flex items-center gap-3">
                    <AppSaveButton label="Save interests" severity="secondary" :loading="interestsSaving" :disabled="!interestsDirty" @click="saveInterests" />
                    <div v-if="interestsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                  </div>
                  <div v-if="interestsHelperText" class="text-sm text-red-700 dark:text-red-300">
                    {{ interestsHelperText }}
                  </div>
                </div>
              </div>

              <div v-if="showsBlock('verification')" class="space-y-6">
                <div v-if="composedBlocks.length > 1" class="border-t moh-border pt-6 -mt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Verification
                  </div>
                </div>
                <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="font-semibold text-gray-900 dark:text-gray-50">Your verification</div>
                    <AppVerifiedBadge
                      :status="authUser?.verifiedStatus ?? 'none'"
                      :premium="Boolean(authUser?.premium)"
                      :premium-plus="Boolean(authUser?.premiumPlus)"
                      :is-organization="Boolean((authUser as any)?.isOrganization)"
                      :steward-badge-enabled="authUser?.stewardBadgeEnabled ?? true"
                    />
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <div class="moh-text-muted">Status</div>
                    <div class="text-sm">
                      <Tag :value="verificationStatusLabel" :severity="verificationStatusSeverity" class="!text-xs" />
                    </div>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <div class="moh-text-muted">Verified at</div>
                    <div class="font-mono text-xs">{{ verifiedAtLabel }}</div>
                  </div>

                  <div v-if="verificationLatestRequest" class="pt-2 space-y-2">
                    <div class="text-xs moh-text-muted">Latest request</div>

                    <div class="flex items-center justify-between gap-3">
                      <div class="moh-text-muted">Request status</div>
                      <Tag :value="requestStatusLabel" :severity="requestStatusSeverity" class="!text-xs" />
                    </div>

                    <div class="flex items-center justify-between gap-3">
                      <div class="moh-text-muted">Submitted</div>
                      <div class="font-mono text-xs">{{ requestSubmittedAtLabel }}</div>
                    </div>

                    <div v-if="verificationLatestRequest.reviewedAt" class="flex items-center justify-between gap-3">
                      <div class="moh-text-muted">Reviewed</div>
                      <div class="font-mono text-xs">{{ requestReviewedAtLabel }}</div>
                    </div>

                    <div v-if="verificationLatestRequest.rejectionReason" class="space-y-1">
                      <div class="text-xs moh-text-muted">Reason</div>
                      <div class="text-sm moh-text">{{ verificationLatestRequest.rejectionReason }}</div>
                    </div>
                  </div>
                </div>

                <AppInlineAlert v-if="verificationError" severity="danger">
                  {{ verificationError }}
                </AppInlineAlert>

                <div class="flex flex-wrap items-center gap-3">
                  <Button
                    label="Start verification"
                    :loading="verificationStarting"
                    :disabled="verificationStarting || verificationStartDisabled"
                    @click="startVerification()"
                  >
                    <template #icon>
                      <Icon name="tabler:id-badge" aria-hidden="true" />
                    </template>
                  </Button>
                  <Button
                    label="Refresh"
                    severity="secondary"
                    :loading="verificationRefreshing"
                    :disabled="verificationRefreshing"
                    @click="refreshVerification()"
                  >
                    <template #icon>
                      <Icon name="tabler:refresh" aria-hidden="true" />
                    </template>
                  </Button>
                  <div v-if="verificationStartDisabledReason" class="text-sm moh-text-muted">
                    {{ verificationStartDisabledReason }}
                  </div>
                </div>

                <div class="text-xs moh-text-muted">
                  Provider integration isn’t live yet. For now, your request will show as pending until an admin manually reviews it.
                </div>

                <div
                  v-if="authUser?.premiumPlus"
                  class="rounded-xl border moh-border p-3 moh-surface space-y-3 text-sm"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1">
                      <div class="font-semibold text-gray-900 dark:text-gray-50">Steward badge</div>
                      <div class="text-xs moh-text-muted">
                        Show a Steward (Premium+) badge next to your verified badge across the app.
                      </div>
                    </div>
                    <Checkbox
                      v-model="stewardBadgeEnabledInput"
                      binary
                      inputId="moh-steward-badge-enabled"
                      :disabled="stewardBadgeSaving"
                    />
                  </div>

                  <div class="flex flex-wrap items-center gap-3">
                    <AppSaveButton severity="secondary" :loading="stewardBadgeSaving" :disabled="!stewardBadgeDirty" @click="saveStewardBadge" />
                    <div v-if="stewardBadgeSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                  </div>

                  <AppInlineAlert v-if="stewardBadgeError" severity="danger">{{ stewardBadgeError }}</AppInlineAlert>
                </div>
              </div>

            <div v-if="showsBlock('billing')" class="space-y-6">
              <div class="space-y-2">
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Billing</div>
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  Manage Premium and Premium+.
                </div>
              </div>

              <div class="rounded-xl border moh-border p-4 moh-surface space-y-4 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Verified</div>
                  <div class="flex items-center gap-2 font-semibold">
                    <span v-if="billingMe?.verified">Yes</span>
                    <span v-else>No</span>
                    <AppVerifiedBadge
                      v-if="billingMe?.verified"
                      :status="authUser?.verifiedStatus ?? 'none'"
                      :premium="Boolean(billingMe?.premium)"
                      :premium-plus="Boolean(billingMe?.premiumPlus)"
                      :is-organization="Boolean((authUser as any)?.isOrganization)"
                      :steward-badge-enabled="authUser?.stewardBadgeEnabled ?? true"
                    />
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Premium</div>
                  <div class="font-semibold">
                    <span v-if="billingMe?.premiumPlus" class="text-orange-700 dark:text-orange-300">Premium+</span>
                    <span v-else-if="billingMe?.premium" class="text-amber-700 dark:text-amber-300">Premium</span>
                    <span v-else class="moh-text-muted">No</span>
                  </div>
                </div>
                <div v-if="billingMe?.effectiveExpiresAt" class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Good through</div>
                  <div class="font-mono text-xs">{{ formatDateTime(billingMe.effectiveExpiresAt) }}</div>
                </div>
                <div v-if="billingMe?.subscriptionStatus" class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Subscription</div>
                  <div class="font-mono text-xs">{{ billingMe.subscriptionStatus }}</div>
                </div>
                <div v-if="billingMe?.currentPeriodEnd" class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Renews</div>
                  <div class="font-mono text-xs">{{ formatDateTime(billingMe.currentPeriodEnd) }}</div>
                </div>
                <div v-if="billingMe?.cancelAtPeriodEnd" class="text-xs text-amber-700 dark:text-amber-300">
                  Canceling at period end.
                </div>

                <template v-if="billingHasAnyFreeMonths">
                  <div class="border-t border-gray-200 dark:border-zinc-700 pt-3 space-y-2.5">
                    <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <span>Free months</span>
                      <Icon
                        name="tabler:info-circle"
                        class="h-4 w-4"
                        aria-hidden="true"
                        title="Banked free months are used before paid billing. Premium+ months are consumed first."
                      />
                    </div>

                    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div
                        v-if="billingFreeMonthsPremiumPlus > 0"
                        class="rounded-lg border border-orange-300 bg-orange-50/90 p-3 dark:border-orange-800/50 dark:bg-orange-950/25"
                      >
                        <div class="text-xs font-medium text-orange-900 dark:text-orange-200">Free Premium+</div>
                        <div class="mt-1 text-2xl font-semibold text-orange-950 dark:text-orange-100">{{ billingFreeMonthsPremiumPlus }}</div>
                        <div class="text-xs text-orange-800 dark:text-orange-300">month{{ billingFreeMonthsPremiumPlus === 1 ? '' : 's' }} left</div>
                      </div>
                      <div
                        v-if="billingFreeMonthsPremium > 0"
                        class="rounded-lg border border-amber-300 bg-amber-50/90 p-3 dark:border-amber-800/50 dark:bg-amber-950/25"
                      >
                        <div class="text-xs font-medium text-amber-900 dark:text-amber-200">Free Premium</div>
                        <div class="mt-1 text-2xl font-semibold text-amber-950 dark:text-amber-100">{{ billingFreeMonthsPremium }}</div>
                        <div class="text-xs text-amber-800 dark:text-amber-300">month{{ billingFreeMonthsPremium === 1 ? '' : 's' }} left</div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <AppInlineAlert v-if="billingError" severity="danger">{{ billingError }}</AppInlineAlert>

              <div class="flex flex-wrap items-center gap-3">
                <Button
                  v-if="billingMe?.verified && !billingMe?.premium"
                  label="Get Premium"
                  :loading="checkoutLoading === 'premium'"
                  :disabled="Boolean(checkoutLoading)"
                  @click="startCheckout('premium')"
                />
                <Button
                  v-if="billingMe?.verified && !billingMe?.premiumPlus"
                  label="Get Premium+"
                  severity="secondary"
                  :loading="checkoutLoading === 'premiumPlus'"
                  :disabled="Boolean(checkoutLoading)"
                  @click="startCheckout('premiumPlus')"
                />
                <Button
                  v-if="billingMe?.verified && (billingMe?.premium || billingMe?.premiumPlus)"
                  label="Manage subscription"
                  severity="secondary"
                  :loading="portalLoading"
                  :disabled="portalLoading"
                  @click="openPortal"
                />
                <NuxtLink
                  v-if="billingMe && !billingMe.verified"
                  to="/settings/verification"
                  class="text-sm font-medium text-gray-700 hover:underline dark:text-gray-300"
                >
                  Verify to subscribe
                </NuxtLink>
                <Button
                  v-if="isDev && (billingMe?.premium || billingMe?.premiumPlus)"
                  label="DEV: Remove Premium"
                  severity="danger"
                  size="small"
                  outlined
                  :loading="devResetLoading"
                  @click="devResetPremium"
                />
              </div>

              <div v-if="billingLoading" class="text-sm moh-text-muted">Loading billing…</div>

              <!-- Referrals -->
              <div v-if="billingMe" class="space-y-4 border-t border-gray-200 pt-4 dark:border-zinc-800">
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Referrals</div>

                <!-- Your referral code (premium-only) -->
                <div class="rounded-xl border moh-border p-4 moh-surface space-y-3 text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="font-medium text-gray-700 dark:text-gray-200">Your referral code</div>
                  </div>
                  <template v-if="billingMe.premium">
                    <div v-if="billingMe.referralCode" class="flex items-center gap-2">
                      <span class="font-mono text-base font-semibold tracking-wide">{{ billingMe.referralCode }}</span>
                      <button
                        type="button"
                        class="text-xs underline transition-colors"
                        :class="referralCodeCopied
                          ? 'text-green-600 dark:text-green-400 cursor-default'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'"
                        :disabled="referralCodeCopied"
                        @click="copyReferralCode"
                      >{{ referralCodeCopied ? 'Copied!' : 'Copy' }}</button>
                    </div>
                    <p v-if="billingMe.referralCode" class="text-xs text-gray-500 dark:text-gray-400">
                      Share this code. Anyone who uses it will automatically follow you — and when they go premium you both earn +1 free month.
                    </p>
                    <div class="flex gap-2">
                      <InputText
                        v-model="referralCodeDraft"
                        class="flex-1 font-mono"
                        :placeholder="billingMe.referralCode ? 'Change code' : 'Set your code (e.g. YOURNAME)'"
                        spellcheck="false"
                        autocomplete="off"
                        maxlength="20"
                        :disabled="referralCodeSaving"
                      />
                      <Button
                        :label="billingMe.referralCode ? 'Update' : 'Set'"
                        :loading="referralCodeSaving"
                        :disabled="!referralCodeDraft.trim() || referralCodeSaving"
                        @click="saveReferralCode"
                      />
                    </div>
                    <AppInlineAlert v-if="referralCodeError" severity="danger">{{ referralCodeError }}</AppInlineAlert>
                    <div v-if="referralCodeSaved" class="text-xs text-green-700 dark:text-green-400">Referral code saved.</div>
                    <p class="text-xs text-gray-400 dark:text-gray-500">4–20 characters. Letters, numbers, hyphens, underscores only.</p>
                  </template>
                  <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                    Become a premium member to get a referral code.
                  </p>
                </div>

                <!-- Recruiter -->
                <div class="rounded-xl border moh-border p-4 moh-surface space-y-3 text-sm">
                  <div class="font-medium text-gray-700 dark:text-gray-200">Who recruited you</div>
                  <template v-if="billingMe.recruiter">
                    <!-- Rich recruiter card with hover preview -->
                    <NuxtLink
                      v-if="billingMe.recruiter.username"
                      :to="`/u/${billingMe.recruiter.username}`"
                      class="flex items-center gap-3 rounded-xl border moh-border p-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <AppUserAvatar
                        :user="{
                          id: billingMe.recruiter.id,
                          avatarUrl: billingMe.recruiter.avatarUrl,
                          name: billingMe.recruiter.name,
                          username: billingMe.recruiter.username,
                          premiumPlus: billingMe.recruiter.premiumPlus,
                        }"
                        size-class="h-10 w-10 shrink-0"
                        :show-presence="false"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-semibold text-gray-900 dark:text-gray-50 truncate">
                            {{ billingMe.recruiter.name || billingMe.recruiter.username }}
                          </span>
                          <AppVerifiedBadge
                            :status="billingMe.recruiter.verifiedStatus"
                            :premium="billingMe.recruiter.premium"
                            :premium-plus="billingMe.recruiter.premiumPlus"
                            size="xs"
                          />
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          @{{ billingMe.recruiter.username }}
                        </div>
                      </div>
                      <div class="shrink-0 flex flex-col items-end gap-1">
                        <Icon name="tabler:user-check" class="h-4 w-4 text-green-600" aria-hidden="true" />
                        <span
                          v-if="billingMe.referralBonusGranted"
                          class="text-[11px] text-green-700 dark:text-green-400 font-medium"
                        >Bonus granted</span>
                        <span v-else class="text-[11px] text-gray-400 dark:text-gray-500">Bonus pending</span>
                      </div>
                    </NuxtLink>
                    <!-- Fallback: no username -->
                    <div v-else class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <Icon name="tabler:user-check" class="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
                      <span>{{ billingMe.recruiter.name ?? 'Unknown' }}</span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Your recruiter is locked in. When you make your first premium payment, you both receive +1 free month.</p>
                  </template>
                  <template v-else>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Enter a referral code to link a recruiter. You'll automatically follow them — and when you go premium you both earn +1 free month. Once set, it cannot be changed.</p>
                    <div class="flex gap-2">
                      <InputText
                        v-model="recruiterCodeDraft"
                        class="flex-1 font-mono"
                        placeholder="Enter referral code"
                        spellcheck="false"
                        autocomplete="off"
                        :disabled="recruiterSaving"
                      />
                      <Button
                        label="Apply"
                        :loading="recruiterSaving"
                        :disabled="!recruiterCodeDraft.trim() || recruiterSaving"
                        @click="applyRecruiter"
                      />
                    </div>
                    <AppInlineAlert v-if="recruiterError" severity="danger">{{ recruiterError }}</AppInlineAlert>
                  </template>
                </div>

                <!-- Recruits list -->
                <div v-if="billingMe.premium" class="rounded-xl border moh-border p-4 moh-surface space-y-3 text-sm">
                  <div class="flex items-center justify-between gap-2">
                    <div class="font-medium text-gray-700 dark:text-gray-200">
                      Your recruits
                      <span v-if="billingMe.recruitCount > 0" class="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{{ billingMe.recruitCount }}</span>
                    </div>
                  </div>
                  <template v-if="recruitsLoading">
                    <div class="text-xs text-gray-500 dark:text-gray-400">Loading recruits…</div>
                  </template>
                  <template v-else-if="recruits.length === 0">
                    <p class="text-xs text-gray-500 dark:text-gray-400">No one has used your code yet. Share it!</p>
                  </template>
                  <ul v-else class="divide-y divide-gray-100 dark:divide-zinc-800">
                    <li v-for="r in recruits" :key="r.id" class="flex items-center justify-between gap-3 py-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <Icon name="tabler:user-plus" class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                        <span class="truncate font-medium">
                          <NuxtLink v-if="r.username" :to="`/u/${r.username}`" class="hover:underline">@{{ r.username }}</NuxtLink>
                          <span v-else>{{ r.name ?? r.id }}</span>
                        </span>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        <span v-if="r.bonusGranted" class="text-green-600 dark:text-green-400 font-medium">+1 month</span>
                        <span v-else-if="r.isPremium" class="text-amber-600 dark:text-amber-400">premium</span>
                        <span v-else>no premium yet</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

              <SettingsPrivacySection
                v-if="showsBlock('privacy')"
                :follow-visibility-input="followVisibilityInput"
                :birthday-visibility-input="birthdayVisibilityInput"
                :follow-visibility-options="followVisibilityOptions"
                :birthday-visibility-options="birthdayVisibilityOptions"
                :privacy-saving="privacySaving"
                :privacy-dirty="privacyDirty"
                :privacy-saved="privacySaved"
                :privacy-error="privacyError"
                @update:follow-visibility-input="followVisibilityInput = $event"
                @update:birthday-visibility-input="birthdayVisibilityInput = $event"
                @save="savePrivacy"
              />

              <div v-if="showsBlock('notifications')" class="space-y-6">
                <SettingsBrowserNotificationsSection
                  :push-vapid-configured="pushVapidConfigured"
                  :push-is-supported="pushIsSupported"
                  :push-requires-install="pushRequiresInstall"
                  :push-initial-state-checked="pushInitialStateChecked"
                  :push-is-subscribed="pushIsSubscribed"
                  :push-permission="pushPermission"
                  :push-is-registering="pushIsRegistering"
                  :push-subscribe="pushSubscribe"
                  :push-unsubscribe="pushUnsubscribe"
                  :push-test-sending="pushTestSending"
                  :send-push-test="sendPushTest"
                  :push-error-message="pushErrorMessage"
                  :push-test-message="pushTestMessage"
                />

                <div class="rounded-xl border moh-border p-3 moh-surface space-y-4">
                  <div class="space-y-1">
                    <div class="font-semibold text-gray-900 dark:text-gray-50">Notification preferences</div>
                    <div class="text-xs moh-text-muted">
                      These control what we send as browser notifications and emails.
                    </div>
                  </div>

                  <div v-if="notifPrefsLoading" class="text-sm moh-text-muted">Loading preferences…</div>
                  <AppInlineAlert v-else-if="notifPrefsError" severity="danger">{{ notifPrefsError }}</AppInlineAlert>

                  <div v-else-if="notifPrefs" class="space-y-4">
                    <div class="space-y-2">
                      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Browser notifications (push)
                      </div>
                      <div class="grid gap-3">
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Replies</div>
                            <div class="text-xs moh-text-muted">When someone replies to you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushComment" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Boosts</div>
                            <div class="text-xs moh-text-muted">When someone boosts your post.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushBoost" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Follows</div>
                            <div class="text-xs moh-text-muted">When someone follows you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushFollow" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Mentions</div>
                            <div class="text-xs moh-text-muted">When someone mentions you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushMention" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Messages</div>
                            <div class="text-xs moh-text-muted">Direct messages.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushMessage" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Reposts</div>
                            <div class="text-xs moh-text-muted">When someone reposts your post.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushRepost" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Nudges</div>
                            <div class="text-xs moh-text-muted">When someone nudges you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushNudge" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Posts from people you follow</div>
                            <div class="text-xs moh-text-muted">When someone you follow shares a new post (bell enabled).</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushFollowedPost" binary :disabled="notifPrefsSaving" />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-2">
                      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Email
                      </div>
                      <div
                        v-if="route.query.digest_unsubscribed === '1'"
                        class="rounded-lg border moh-border p-2 text-sm moh-surface"
                      >
                        Daily digest disabled. You can re-enable it below.
                      </div>
                      <div v-if="!authUser?.email" class="text-sm text-gray-600 dark:text-gray-300">
                        Add an email in <NuxtLink to="/settings/account" class="font-medium hover:underline">Your account</NuxtLink> to enable email notifications.
                      </div>
                      <div v-else class="grid gap-3">
                        <div
                          v-if="!emailIsVerified"
                          class="rounded-lg border moh-border p-3 text-sm moh-surface"
                        >
                          <div class="font-semibold">Verify your email to enable email notifications.</div>
                          <div class="mt-1 text-xs moh-text-muted">
                            Your settings are saved, but sending is disabled until verification.
                          </div>
                          <div class="mt-2">
                            <NuxtLink to="/settings/account" class="font-medium hover:underline underline-offset-2">
                              Go to account settings to verify →
                            </NuxtLink>
                          </div>
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Daily digest</div>
                            <div class="text-xs moh-text-muted">A daily recap (recommended).</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailDigestDaily" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Weekly digest</div>
                            <div class="text-xs moh-text-muted">A Sunday morning recap: best post of the week + new members.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailDigestWeekly" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">New notifications</div>
                            <div class="text-xs moh-text-muted">A nudge when you have unread notifications.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailNewNotifications" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Instant emails (high-signal)</div>
                            <div class="text-xs moh-text-muted">
                              Messages, mentions, and replies. Batched + throttled so it won’t spam you.
                            </div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailInstantHighSignal" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">New articles from people you follow</div>
                            <div class="text-xs moh-text-muted">
                              Get an email when someone you follow publishes a new article.
                            </div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailFollowedArticle" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                      </div>
                    </div>

                    <div class="rounded-xl border moh-border p-3 moh-surface space-y-3">
                      <div class="font-semibold text-gray-900 dark:text-gray-50">Article topics you follow</div>
                      <div class="text-xs moh-text-muted">
                        We use these tags to personalize your weekly digest.
                      </div>
                      <div v-if="tagPrefsLoading" class="text-sm moh-text-muted">Loading topics…</div>
                      <AppInlineAlert v-else-if="tagPrefsError" severity="danger">{{ tagPrefsError }}</AppInlineAlert>
                      <div v-else class="space-y-3">
                        <AppArticleTagInput v-model="preferredArticleTags" />
                        <div class="flex flex-wrap items-center gap-3">
                          <Button
                            label="Save topics"
                            severity="secondary"
                            :loading="tagPrefsSaving"
                            :disabled="tagPrefsSaving || !tagPrefsDirty || !emailIsVerified"
                            @click="saveTagPrefs"
                          />
                          <div v-if="tagPrefsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                      <Button
                        label="Save preferences"
                        severity="secondary"
                        :loading="notifPrefsSaving"
                        :disabled="notifPrefsSaving || !notifPrefsDirty"
                        @click="saveNotifPrefs"
                      />
                      <div v-if="notifPrefsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="showsBlock('blocked')" class="space-y-4">
                <div v-if="composedBlocks.length > 1" class="border-t moh-border pt-6 -mt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Blocked users
                  </div>
                </div>
                <SettingsBlockedUsersSection />
              </div>

              <div v-if="showsBlock('links')" class="space-y-4">
                <div v-if="composedBlocks.length > 1" class="border-t moh-border pt-6 -mt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Helpful links
                  </div>
                </div>
                <SettingsLinksSection />
              </div>

              <div v-if="composedBlocks.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
                Choose a section from the left.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Checkout success modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="checkoutSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="checkoutSuccessModal = false"
        >
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 text-center space-y-4">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full" :class="checkoutSuccessTier === 'premiumPlus' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-amber-100 dark:bg-amber-900/30'">
              <Icon name="tabler:crown" class="h-7 w-7" :class="checkoutSuccessTier === 'premiumPlus' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'" />
            </div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-50">
              Welcome to {{ checkoutSuccessTier === 'premiumPlus' ? 'Premium+' : 'Premium' }}!
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Thank you for supporting Men of Hunger. Your subscription is now active and you have access to all {{ checkoutSuccessTier === 'premiumPlus' ? 'Premium+' : 'Premium' }} features.
            </p>
            <div class="flex flex-col gap-2 pt-2">
              <NuxtLink
                to="/tiers"
                class="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 text-white"
                :class="checkoutSuccessTier === 'premiumPlus' ? 'bg-orange-600' : 'bg-amber-600'"
                @click="checkoutSuccessModal = false"
              >
                See what's included
              </NuxtLink>
              <button
                type="button"
                class="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                @click="checkoutSuccessModal = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Settings',
  ssr: false,
})

usePageSeo({
  title: 'Settings',
  description: 'Account settings.',
  canonicalPath: '/settings',
  noindex: true
})

type FollowVisibility = 'all' | 'verified' | 'premium' | 'none'
type BirthdayVisibility = 'none' | 'monthDay' | 'full'
// Top-level Settings now has only four sections:
//   account              — username, email, profile, location, interests, verification, useful links
//   notifications        — push permission + per-event notification matrix
//   privacy              — visibility settings + blocked users
//   billing              — Premium subscription management
// The previous narrower keys (`verification`, `blocked`, `links`) are kept as
// "blocks" that the merged sections compose (see `composedBlocks` below) and
// as legacy URL aliases that redirect to their new home.
type SettingsSection = 'account' | 'notifications' | 'privacy' | 'billing'
type SettingsBlock =
  | 'account'
  | 'verification'
  | 'billing'
  | 'privacy'
  | 'notifications'
  | 'blocked'
  | 'links'

const isDev = import.meta.dev
const { user: authUser, ensureLoaded, me } = useAuth()
const { invalidateUserPreviewCache } = useUserPreview()
const usersStore = useUsersStore()
const route = useRoute()
const toast = useAppToast()
const emailVerificationUiReady = ref(false)

// Ensure we have the current user (so inputs can prefill immediately).
await ensureLoaded()
// Important: `ensureLoaded()` is a no-op once auth has loaded. When navigating here
// after an out-of-band update (e.g. admin unverifies email), force a refresh.
onMounted(() => {
  // Don't show resend controls until we know the server timestamp
  // (prevents refresh -> click -> bypass countdown UI).
  emailVerificationUiReady.value = false
  void me().finally(() => {
    emailVerificationUiReady.value = true
  })
})

// Show a one-time toast after email verification redirect.
onMounted(() => {
  if (!import.meta.client) return
  if (route.query.email_verified !== '1') return
  toast.push({ title: 'Email was verified.', tone: 'success', durationMs: 2200 })
  // Remove query param so it doesn't re-toast on refresh/back.
  const nextQuery = { ...(route.query as Record<string, any>) }
  delete nextQuery.email_verified
  delete nextQuery.reason
  void navigateTo({ path: route.path, query: nextQuery }, { replace: true })
})

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { useFormSave } from '~/composables/useFormSave'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { formatDateTime } from '~/utils/time-format'
import SettingsPrivacySection from '~/components/settings/sections/SettingsPrivacySection.vue'
import type {
  ArticleTag,
  BillingCheckoutSession,
  BillingMe,
  BillingPortalSession,
  BillingTier,
  MyVerificationStatus,
  NotificationPreferences,
  Recruit,
  TaxonomyPreference,
  VerificationRequestPublic
} from '~/types/api'
import { siteConfig } from '~/config/site'

function syncUserCaches(
  nextUser: import('~/composables/useAuth').AuthUser | null | undefined,
  previousUsername?: string | null,
) {
  const prev = (previousUsername ?? '').trim().toLowerCase()
  const next = (nextUser?.username ?? '').trim().toLowerCase()
  if (prev) invalidateUserPreviewCache(prev)
  if (next) invalidateUserPreviewCache(next)
  if (import.meta.client) {
    if (prev) {
      clearNuxtData(`public-profile:${prev}`)
      clearNuxtData(`follow-summary:${prev}`)
    }
    if (next) {
      clearNuxtData(`public-profile:${next}`)
      clearNuxtData(`follow-summary:${next}`)
    }
  }
  if (!nextUser?.id) return
  usersStore.upsert({
    id: nextUser.id,
    username: nextUser.username ?? null,
    name: nextUser.name ?? null,
    bio: nextUser.bio ?? null,
    premium: nextUser.premium,
    premiumPlus: nextUser.premiumPlus,
    verifiedStatus: nextUser.verifiedStatus,
    avatarUrl: nextUser.avatarUrl ?? null,
    bannerUrl: nextUser.bannerUrl ?? null,
    pinnedPostId: nextUser.pinnedPostId ?? null,
  })
}

const {
  permission: pushPermission,
  isSubscribed: pushIsSubscribed,
  isRegistering: pushIsRegistering,
  errorMessage: pushErrorMessage,
  isSupported: pushIsSupported,
  requiresInstall: pushRequiresInstall,
  vapidConfigured: pushVapidConfigured,
  refreshSubscriptionState,
  subscribe,
  unsubscribe,
} = usePushNotifications()
const pushTestSending = ref(false)
const pushTestMessage = ref('')
const pushInitialStateChecked = ref(false)
const pushStateLoadedOnce = ref(false)

async function pushSubscribe() {
  await subscribe()
}

async function pushUnsubscribe() {
  await unsubscribe()
}

async function sendPushTest() {
  pushTestMessage.value = ''
  pushTestSending.value = true
  try {
    const res = await apiFetch<{ sent: boolean; message?: string }>('/notifications/push-test', {
      method: 'POST'
    })
    const data = res?.data
    if (data?.sent) {
      pushTestMessage.value = 'Test sent.'
    } else {
      pushTestMessage.value = data?.message ?? 'Could not send test.'
    }
  } catch (e) {
    pushTestMessage.value = getApiErrorMessage(e) ?? 'Failed to send test.'
  } finally {
    pushTestSending.value = false
  }
}

const allowedSections: SettingsSection[] = ['account', 'notifications', 'privacy', 'billing']

// Old narrower URL keys redirect into one of the 4 top-level sections.
const sectionAlias: Record<string, SettingsSection> = {
  verification: 'account',
  links: 'account',
  blocked: 'privacy',
}

function normalizeSection(raw: string | null): SettingsSection | null {
  if (!raw) return null
  if ((allowedSections as string[]).includes(raw)) return raw as SettingsSection
  if (raw in sectionAlias) return sectionAlias[raw] ?? null
  return null
}

const routeSection = computed<SettingsSection | null>(() => {
  const raw = typeof route.params.section === 'string' ? route.params.section : null
  return normalizeSection(raw)
})

// Legacy support: /settings?section=links -> /settings/account, etc.
const legacySection = computed<SettingsSection | null>(() => {
  const raw = typeof route.query.section === 'string' ? route.query.section : null
  return normalizeSection(raw)
})

// Redirect aliased URLs to their canonical 4-section home so the URL bar
// reflects the actual section being shown.
const rawRouteParam = typeof route.params.section === 'string' ? route.params.section : null
if (rawRouteParam && rawRouteParam in sectionAlias) {
  await navigateTo(`/settings/${sectionAlias[rawRouteParam]}`, { replace: true })
}

if (!routeSection.value && legacySection.value) {
  await navigateTo(`/settings/${legacySection.value}`, { replace: true })
}

const selectedSection = ref<SettingsSection | null>(routeSection.value)
watch(
  routeSection,
  (s) => {
    selectedSection.value = s
  },
  { immediate: true }
)

const sectionQuery = ref('')

const sections = computed(() => [
  {
    key: 'account' as const,
    label: 'Your account',
    description: 'Username, email, profile, verification, and helpful links.'
  },
  {
    key: 'notifications' as const,
    label: 'Notifications',
    description: 'Browser permission and per-event alert preferences.'
  },
  {
    key: 'privacy' as const,
    label: 'Privacy & Safety',
    description: 'Visibility settings and blocked users.'
  },
  {
    key: 'billing' as const,
    label: 'Billing',
    description: 'Premium and Premium+ subscriptions.'
  }
])

// Each top-level section is composed from one or more "blocks" (the original
// narrower sections). Rendering them as independent `v-if` siblings (instead of
// a single `v-if/v-else-if` chain) lets us mount multiple blocks under one URL
// without restructuring the template into a single big `<template v-if>`.
const sectionToBlocks: Record<SettingsSection, ReadonlyArray<SettingsBlock>> = {
  account: ['account', 'verification', 'links'],
  notifications: ['notifications'],
  privacy: ['privacy', 'blocked'],
  billing: ['billing'],
}

const composedBlocks = computed<ReadonlyArray<SettingsBlock>>(() => {
  const s = selectedSection.value
  return s ? sectionToBlocks[s] : []
})

function showsBlock(block: SettingsBlock): boolean {
  return composedBlocks.value.includes(block)
}

const filteredSections = computed(() => {
  const q = sectionQuery.value.trim().toLowerCase()
  if (!q) return sections.value
  return sections.value.filter((s) => (s.label + ' ' + s.description).toLowerCase().includes(q))
})

function sectionRowClass(key: SettingsSection) {
  const active = selectedSection.value === key
  return [
    'block px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] transition-colors',
    active
      ? 'moh-pane-row-active'
      : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
  ]
}

const { isTinyViewport, showListPane, showDetailPane, gridStyle } = useTwoPaneLayout(selectedSection, {
  leftCols: '22rem',
})

watch(
  isTinyViewport,
  async (tiny) => {
    // On desktop, default to first section by route (so URL reflects selection).
    if (!tiny && !routeSection.value) {
      await navigateTo('/settings/account', { replace: true })
    }
  },
  { immediate: true }
)

const selectedSectionLabel = computed(() => sections.value.find((s) => s.key === selectedSection.value)?.label || 'Settings')
const selectedSectionDescription = computed(
  () => sections.value.find((s) => s.key === selectedSection.value)?.description || 'Choose a section.'
)

const billingMe = ref<BillingMe | null>(null)
const billingLoading = ref(false)
const billingError = ref<string | null>(null)
const checkoutLoading = ref<BillingTier | null>(null)
const portalLoading = ref(false)
const BILLING_MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000

const billingFreeMonthsPremiumPlus = computed(() => {
  const now = Date.now()
  const grants = billingMe.value?.grants ?? []
  const remainingMs = grants
    .filter((g) => g.tier === 'premiumPlus')
    .reduce((sum, g) => {
      const endsAtMs = new Date(String(g.endsAt)).getTime()
      if (!Number.isFinite(endsAtMs)) return sum
      return sum + Math.max(0, endsAtMs - now)
    }, 0)
  return Math.round(remainingMs / BILLING_MS_PER_MONTH)
})

const billingFreeMonthsPremium = computed(() => {
  const now = Date.now()
  const grants = billingMe.value?.grants ?? []
  const remainingMs = grants
    .filter((g) => g.tier === 'premium')
    .reduce((sum, g) => {
      const endsAtMs = new Date(String(g.endsAt)).getTime()
      if (!Number.isFinite(endsAtMs)) return sum
      return sum + Math.max(0, endsAtMs - now)
    }, 0)
  return Math.round(remainingMs / BILLING_MS_PER_MONTH)
})

const billingHasAnyFreeMonths = computed(() =>
  billingFreeMonthsPremiumPlus.value > 0 || billingFreeMonthsPremium.value > 0,
)

async function refreshBilling() {
  billingLoading.value = true
  billingError.value = null
  try {
    billingMe.value = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
  } catch (e: unknown) {
    billingError.value = getApiErrorMessage(e) || 'Failed to load billing.'
  } finally {
    billingLoading.value = false
  }
}

watch(
  selectedSection,
  (s) => {
    if (s === 'billing') void refreshBilling()
  },
  { immediate: true }
)

async function startCheckout(tier: BillingTier) {
  if (checkoutLoading.value) return
  checkoutLoading.value = tier
  billingError.value = null
  try {
    const res = await apiFetchData<BillingCheckoutSession>('/billing/checkout-session', {
      method: 'POST',
      body: { tier }
    })
    const url = (res?.url ?? '').trim()
    if (!url) throw new Error('Missing checkout URL.')
    await navigateTo(url, { external: true })
  } catch (e: unknown) {
    billingError.value = getApiErrorMessage(e) || 'Failed to start checkout.'
  } finally {
    checkoutLoading.value = null
  }
}

async function openPortal() {
  if (portalLoading.value) return
  portalLoading.value = true
  billingError.value = null
  try {
    const res = await apiFetchData<BillingPortalSession>('/billing/portal-session', {
      method: 'POST'
    })
    const url = (res?.url ?? '').trim()
    if (!url) throw new Error('Missing portal URL.')
    await navigateTo(url, { external: true })
  } catch (e: unknown) {
    billingError.value = getApiErrorMessage(e) || 'Failed to open billing portal.'
  } finally {
    portalLoading.value = false
  }
}

// ─── Dev-only: reset premium ──────────────────────────────────────────────────

const devResetLoading = ref(false)

async function devResetPremium() {
  if (devResetLoading.value) return
  devResetLoading.value = true
  try {
    await apiFetchData('/billing/dev-reset', { method: 'DELETE' })
    await refreshBilling()
    await me()
    toast.push({ title: 'Premium removed (dev).', tone: 'success', durationMs: 2000 })
  } catch (e: unknown) {
    billingError.value = getApiErrorMessage(e) || 'Failed to reset premium.'
  } finally {
    devResetLoading.value = false
  }
}

// ─── Checkout success modal ───────────────────────────────────────────────────

const checkoutSuccessModal = ref(false)
const checkoutSuccessTier = ref<'premium' | 'premiumPlus'>('premium')

onMounted(() => {
  if (!import.meta.client) return
  if (route.query.checkout !== 'success') return

  const pollForPremium = async (attempts = 0) => {
    await refreshBilling()
    if (billingMe.value?.premium || billingMe.value?.premiumPlus) {
      checkoutSuccessTier.value = billingMe.value.premiumPlus ? 'premiumPlus' : 'premium'
      checkoutSuccessModal.value = true
      await me()
    } else if (attempts < 5) {
      setTimeout(() => pollForPremium(attempts + 1), 2000)
      return
    }
    const nextQuery = { ...(route.query as Record<string, any>) }
    delete nextQuery.checkout
    void navigateTo({ path: route.path, query: nextQuery }, { replace: true })
  }
  void pollForPremium()
})

// ─── Referral ────────────────────────────────────────────────────────────────

const referralCodeDraft = ref('')
const referralCodeSaving = ref(false)
const referralCodeSaved = ref(false)
const referralCodeError = ref<string | null>(null)
let referralCodeSavedTimer: ReturnType<typeof setTimeout> | null = null

const referralCodeCopied = ref(false)
let referralCodeCopiedTimer: ReturnType<typeof setTimeout> | null = null

const recruiterCodeDraft = ref('')
const recruiterSaving = ref(false)
const recruiterError = ref<string | null>(null)

const recruits = ref<Recruit[]>([])
const recruitsLoading = ref(false)

async function saveReferralCode() {
  const code = referralCodeDraft.value.trim()
  if (!code) return
  referralCodeSaving.value = true
  referralCodeError.value = null
  referralCodeSaved.value = false
  try {
    const res = await apiFetchData<{ referralCode: string }>('/billing/referral/code', {
      method: 'PUT',
      body: { code }
    })
    referralCodeDraft.value = ''
    referralCodeSaved.value = true
    if (billingMe.value) billingMe.value = { ...billingMe.value, referralCode: res.referralCode }
    if (referralCodeSavedTimer) clearTimeout(referralCodeSavedTimer)
    referralCodeSavedTimer = setTimeout(() => { referralCodeSaved.value = false }, 3000)
  } catch (e: unknown) {
    referralCodeError.value = getApiErrorMessage(e) || 'Failed to save referral code.'
  } finally {
    referralCodeSaving.value = false
  }
}

async function applyRecruiter() {
  const code = recruiterCodeDraft.value.trim()
  if (!code) return
  recruiterSaving.value = true
  recruiterError.value = null
  try {
    await apiFetchData('/billing/referral/set-recruiter', { method: 'POST', body: { code } })
    recruiterCodeDraft.value = ''
    // Refresh billing to get the full rich recruiter object (avatar, badges, etc.)
    await refreshBilling()
  } catch (e: unknown) {
    recruiterError.value = getApiErrorMessage(e) || 'Failed to apply referral code.'
  } finally {
    recruiterSaving.value = false
  }
}

async function copyReferralCode() {
  const code = billingMe.value?.referralCode
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    referralCodeCopied.value = true
    if (referralCodeCopiedTimer) clearTimeout(referralCodeCopiedTimer)
    referralCodeCopiedTimer = setTimeout(() => { referralCodeCopied.value = false }, 2000)
  } catch {
    // clipboard unavailable — silent fail
  }
}

async function loadRecruits() {
  recruitsLoading.value = true
  try {
    recruits.value = await apiFetchData<Recruit[]>('/billing/referral/recruits', { method: 'GET' })
  } catch {
    // non-critical
  } finally {
    recruitsLoading.value = false
  }
}

// Load recruits whenever we land on billing and premium status is known to be true.
// The two reactive sources (section change vs billingMe arriving) are intentionally
// collapsed here: watch the combination so we load exactly once per entry.
watch(
  [selectedSection, () => billingMe.value?.premium],
  ([section, isPremium]) => {
    if (section === 'billing' && isPremium) void loadRecruits()
  },
)

// ─────────────────────────────────────────────────────────────────────────────

const notifPrefs = ref<NotificationPreferences | null>(null)
const notifPrefsInitial = ref<string>('')
const notifPrefsLoading = ref(false)
const notifPrefsSaving = ref(false)
const notifPrefsSaved = ref(false)
const notifPrefsError = ref<string | null>(null)
let notifPrefsSavedTimer: ReturnType<typeof setTimeout> | null = null
const preferredArticleTags = ref<ArticleTag[]>([])
const tagPrefsInitial = ref<string>('')
const tagPrefsLoading = ref(false)
const tagPrefsSaving = ref(false)
const tagPrefsSaved = ref(false)
const tagPrefsError = ref<string | null>(null)
let tagPrefsSavedTimer: ReturnType<typeof setTimeout> | null = null

const notifPrefsDirty = computed(() => {
  if (!notifPrefs.value) return false
  return JSON.stringify(notifPrefs.value) !== notifPrefsInitial.value
})
const tagPrefsDirty = computed(() => JSON.stringify(preferredArticleTags.value) !== tagPrefsInitial.value)

async function loadNotifPrefs() {
  notifPrefsLoading.value = true
  notifPrefsError.value = null
  notifPrefsSaved.value = false
  try {
    const res = await apiFetchData<NotificationPreferences>('/notifications/preferences', { method: 'GET' })
    notifPrefs.value = res
    notifPrefsInitial.value = JSON.stringify(res)
  } catch (e: unknown) {
    notifPrefsError.value = getApiErrorMessage(e) || 'Failed to load preferences.'
  } finally {
    notifPrefsLoading.value = false
  }
}

async function loadTagPrefs() {
  tagPrefsLoading.value = true
  tagPrefsError.value = null
  tagPrefsSaved.value = false
  try {
    const res = await apiFetchData<TaxonomyPreference[]>('/users/me/taxonomy-preferences', { method: 'GET' })
    preferredArticleTags.value = (res ?? []).map((r) => ({ tag: r.slug, label: r.label }))
    tagPrefsInitial.value = JSON.stringify(preferredArticleTags.value)
  } catch (e: unknown) {
    tagPrefsError.value = getApiErrorMessage(e) || 'Failed to load article topics.'
  } finally {
    tagPrefsLoading.value = false
  }
}

watch(
  selectedSection,
  (s) => {
    if (s === 'notifications') {
      if (!pushStateLoadedOnce.value) {
        pushInitialStateChecked.value = false
        void refreshSubscriptionState()
          .catch(() => {})
          .finally(() => {
            pushInitialStateChecked.value = true
            pushStateLoadedOnce.value = true
          })
      }
      void loadNotifPrefs()
      void loadTagPrefs()
    }
  },
  { immediate: true }
)

async function saveNotifPrefs() {
  if (!notifPrefs.value || notifPrefsSaving.value) return
  notifPrefsSaving.value = true
  notifPrefsError.value = null
  notifPrefsSaved.value = false
  try {
    const res = await apiFetchData<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: notifPrefs.value,
    })
    notifPrefs.value = res
    notifPrefsInitial.value = JSON.stringify(res)
    notifPrefsSaved.value = true
    if (notifPrefsSavedTimer) clearTimeout(notifPrefsSavedTimer)
    notifPrefsSavedTimer = setTimeout(() => {
      notifPrefsSavedTimer = null
      notifPrefsSaved.value = false
    }, 1500)
  } catch (e: unknown) {
    notifPrefsError.value = getApiErrorMessage(e) || 'Failed to save preferences.'
  } finally {
    notifPrefsSaving.value = false
  }
}

async function saveTagPrefs() {
  if (tagPrefsSaving.value) return
  tagPrefsSaving.value = true
  tagPrefsError.value = null
  tagPrefsSaved.value = false
  try {
    const res = await apiFetchData<TaxonomyPreference[]>('/users/me/taxonomy-preferences', {
      method: 'PUT',
      body: { slugs: preferredArticleTags.value.map((t) => t.tag) },
    })
    preferredArticleTags.value = (res ?? []).map((r) => ({ tag: r.slug, label: r.label }))
    tagPrefsInitial.value = JSON.stringify(preferredArticleTags.value)
    tagPrefsSaved.value = true
    if (tagPrefsSavedTimer) clearTimeout(tagPrefsSavedTimer)
    tagPrefsSavedTimer = setTimeout(() => {
      tagPrefsSavedTimer = null
      tagPrefsSaved.value = false
    }, 1500)
  } catch (e: unknown) {
    tagPrefsError.value = getApiErrorMessage(e) || 'Failed to save article topics.'
  } finally {
    tagPrefsSaving.value = false
  }
}

onBeforeUnmount(() => {
  if (emailResendTickTimer) {
    clearInterval(emailResendTickTimer)
    emailResendTickTimer = null
  }
  if (notifPrefsSavedTimer) {
    clearTimeout(notifPrefsSavedTimer)
    notifPrefsSavedTimer = null
  }
  if (tagPrefsSavedTimer) {
    clearTimeout(tagPrefsSavedTimer)
    tagPrefsSavedTimer = null
  }
  if (emailResendSavedTimer) {
    clearTimeout(emailResendSavedTimer)
    emailResendSavedTimer = null
  }
  if (referralCodeSavedTimer) {
    clearTimeout(referralCodeSavedTimer)
    referralCodeSavedTimer = null
  }
  if (referralCodeCopiedTimer) {
    clearTimeout(referralCodeCopiedTimer)
    referralCodeCopiedTimer = null
  }
})

const verificationRefreshing = ref(false)
const verificationError = ref<string | null>(null)
const verificationLatestRequest = ref<VerificationRequestPublic | null>(null)

async function refreshVerification() {
  if (verificationRefreshing.value) return
  verificationRefreshing.value = true
  verificationError.value = null
  try {
    const res = await apiFetchData<MyVerificationStatus>('/verification/me', { method: 'GET' })
    verificationLatestRequest.value = res.latestRequest ?? null

    // Keep auth state fresh (useful right after manual approval).
    if (authUser.value) {
      authUser.value = {
        ...authUser.value,
        verifiedStatus: res.verifiedStatus,
        verifiedAt: res.verifiedAt,
        unverifiedAt: res.unverifiedAt,
      }
    }
  } catch (e: unknown) {
    verificationError.value = getApiErrorMessage(e) || 'Failed to load verification status.'
  } finally {
    verificationRefreshing.value = false
  }
}

watch(
  selectedSection,
  () => {
    // Verification is now a block under "account" — refresh whenever that
    // section is open so the badge/status reflects any out-of-band changes.
    if (showsBlock('verification')) void refreshVerification()
  },
  { immediate: true },
)

const { submit: startVerification, submitting: verificationStarting } = useFormSubmit(
  async () => {
    verificationError.value = null
    const req = await apiFetchData<VerificationRequestPublic>('/verification/request', {
      method: 'POST',
      body: {},
    })
    verificationLatestRequest.value = req
  },
  {
    defaultError: 'Failed to start verification.',
    onError: (message) => {
      verificationError.value = message
    },
  },
)

const verificationStatusLabel = computed(() => {
  const s = authUser.value?.verifiedStatus ?? 'none'
  if (s === 'identity') return 'Identity verified'
  if (s === 'manual') return 'Manually verified'
  return 'Not verified'
})

const verificationStatusSeverity = computed(() => {
  const s = authUser.value?.verifiedStatus ?? 'none'
  if (s === 'identity' || s === 'manual') return 'info'
  return 'secondary'
})

const verifiedAtLabel = computed(() => formatDateTime(authUser.value?.verifiedAt, { fallback: '—' }))

const requestStatusLabel = computed(() => {
  const s = verificationLatestRequest.value?.status
  if (s === 'approved') return 'Approved'
  if (s === 'rejected') return 'Rejected'
  if (s === 'cancelled') return 'Cancelled'
  return 'Pending'
})

const requestStatusSeverity = computed(() => {
  const s = verificationLatestRequest.value?.status
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'cancelled') return 'secondary'
  return 'warning'
})

const requestSubmittedAtLabel = computed(() => formatDateTime(verificationLatestRequest.value?.createdAt, { fallback: '—' }))
const requestReviewedAtLabel = computed(() => formatDateTime(verificationLatestRequest.value?.reviewedAt, { fallback: '—' }))

const verificationStartDisabledReason = computed(() => {
  const verified = (authUser.value?.verifiedStatus ?? 'none') !== 'none'
  if (verified) return 'You’re already verified.'
  if (verificationLatestRequest.value?.status === 'pending') return 'Your request is pending review.'
  return ''
})

const verificationStartDisabled = computed(() => Boolean(verificationStartDisabledReason.value))

const usernameInput = ref('')
const emailInput = ref('')
const currentUsername = computed(() => (authUser.value?.username ?? '').trim())
const usernameLocked = computed(() => Boolean(authUser.value?.usernameIsSet || currentUsername.value))
const {
  status: usernameStatus,
  helperText: usernameHelperText,
  isCaseOnlyChange,
} = useUsernameField({
  value: usernameInput,
  currentUsername: currentUsername,
  usernameIsSet: usernameLocked,
  debounceMs: 500,
  lockedInvalidMessage: 'Only capitalization changes are allowed for your username.',
  caseOnlyMessage: 'Only capitalization changes are allowed (this change is OK).',
})

const emailHelperText = ref<string | null>(null)
const emailResendSaving = ref(false)
const emailResendSaved = ref(false)
const emailResendError = ref<string | null>(null)
let emailResendSavedTimer: ReturnType<typeof setTimeout> | null = null
const EMAIL_RESEND_COOLDOWN_SECONDS = 30
const emailResendUiHydrated = ref(false)
const emailResendNowMs = ref<number>(Date.now())
let emailResendTickTimer: ReturnType<typeof setInterval> | null = null

const emailVerificationRequestedAtMs = computed(() => {
  const raw = authUser.value?.emailVerificationRequestedAt ?? null
  if (!raw) return null
  const ms = new Date(String(raw)).getTime()
  return Number.isFinite(ms) ? ms : null
})

const emailResendRetryAfterSeconds = computed(() => {
  // Avoid SSR hydration mismatches: only show the live countdown after mount.
  if (!emailResendUiHydrated.value) return 0
  const requestedAt = emailVerificationRequestedAtMs.value
  if (!requestedAt) return 0
  const until = requestedAt + EMAIL_RESEND_COOLDOWN_SECONDS * 1000
  const remainingMs = until - (emailResendNowMs.value ?? Date.now())
  return Math.max(0, Math.ceil(remainingMs / 1000))
})

const emailResendCooldownActive = computed(() => emailResendRetryAfterSeconds.value > 0)
const emailResendButtonLabel = computed(() =>
  emailResendCooldownActive.value ? `Resend in ${emailResendRetryAfterSeconds.value}s` : 'Resend verification',
)

onMounted(() => {
  if (!import.meta.client) return
  emailResendUiHydrated.value = true
  emailResendNowMs.value = Date.now()
  if (emailResendTickTimer) clearInterval(emailResendTickTimer)
  emailResendTickTimer = setInterval(() => {
    emailResendNowMs.value = Date.now()
  }, 250)
})
const locationQueryInput = ref('')
const websiteInput = ref('')
const profileDetailsHelperText = ref<string | null>(null)
watch(
  () => authUser.value?.email ?? null,
  (v) => {
    if (emailInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    emailInput.value = v
  },
  { immediate: true },
)

watch(
  () => authUser.value?.locationDisplay ?? null,
  (v) => {
    if (locationQueryInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    locationQueryInput.value = v
  },
  { immediate: true },
)

watch(
  () => authUser.value?.website ?? null,
  (v) => {
    if (websiteInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    websiteInput.value = v
  },
  { immediate: true },
)

const emailDirty = computed(() => {
  const current = (authUser.value?.email ?? '').trim().toLowerCase()
  const desired = emailInput.value.trim().toLowerCase()
  return current !== desired
})

const emailIsVerified = computed(() => Boolean(authUser.value?.email && authUser.value?.emailVerifiedAt))

const profileDetailsDirty = computed(() => {
  const currentLocation = (authUser.value?.locationDisplay ?? '').trim().toLowerCase()
  const desiredLocation = locationQueryInput.value.trim().toLowerCase()
  if (currentLocation !== desiredLocation) return true

  const currentWebsite = (authUser.value?.website ?? '').trim().toLowerCase()
  const desiredWebsite = websiteInput.value.trim().toLowerCase()
  return currentWebsite !== desiredWebsite
})

const { save: saveEmailRequest, saving: emailSaving, saved: emailSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const raw = emailInput.value.trim()
    const body = { email: raw ? raw : '' }
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)

    // If they set/changed email, server marks it unverified and sends verification.
    if (result.user?.email && !result.user.emailVerifiedAt) {
      emailResendSaved.value = true
      if (emailResendSavedTimer) clearTimeout(emailResendSavedTimer)
      emailResendSavedTimer = setTimeout(() => {
        emailResendSavedTimer = null
        emailResendSaved.value = false
      }, 2500)
    }
  },
  {
    defaultError: 'Failed to save email.',
    onError: (message) => {
      emailHelperText.value = message
    },
  },
)

async function resendEmailVerification() {
  if (emailResendSaving.value || emailResendCooldownActive.value) return
  emailResendSaving.value = true
  emailResendError.value = null
  emailResendSaved.value = false
  try {
    const res = await apiFetchData<{ sent: boolean; reason?: string; retryAfterSeconds?: number }>('/email/verification/resend', {
      method: 'POST',
    })
    // Always refresh auth state; requestedAt drives the persistent cooldown (survives refresh).
    await me()

    if (res.sent) {
      emailResendSaved.value = true
    } else if (res.reason === 'cooldown') {
      const s = Math.max(1, Math.floor(res.retryAfterSeconds ?? emailResendRetryAfterSeconds.value ?? 1))
      emailResendError.value = `Please wait ${s}s before resending.`
    }
    if (emailResendSavedTimer) clearTimeout(emailResendSavedTimer)
    emailResendSavedTimer = setTimeout(() => {
      emailResendSavedTimer = null
      emailResendSaved.value = false
    }, 2500)
  } catch (e: unknown) {
    emailResendError.value = getApiErrorMessage(e) || 'Failed to resend verification email.'
  } finally {
    emailResendSaving.value = false
  }
}

const {
  save: saveProfileDetailsRequest,
  saving: profileDetailsSaving,
  saved: profileDetailsSaved,
} = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body: {
        locationQuery: locationQueryInput.value.trim(),
        website: websiteInput.value.trim(),
      },
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save profile details.',
    onError: (message) => {
      profileDetailsHelperText.value = message
    },
  },
)

const interestsHelperText = ref<string | null>(null)
const interestsInput = ref<string[]>([])

function normalizeInterests(vals: string[]): string[] {
  return (vals ?? [])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .slice(0, 30)
    .sort((a, b) => a.localeCompare(b))
}

watch(
  () => authUser.value?.interests ?? null,
  (v) => {
    if (interestsInput.value.length > 0) return
    if (!Array.isArray(v) || v.length === 0) return
    interestsInput.value = [...v]
  },
  { immediate: true },
)

const interestsDirty = computed(() => {
  const current = normalizeInterests((authUser.value?.interests ?? []) as string[])
  const desired = normalizeInterests(interestsInput.value)
  if (current.length !== desired.length) return true
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== desired[i]) return true
  }
  return false
})

const { save: saveInterestsRequest, saving: interestsSaving, saved: interestsSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const body = { interests: interestsInput.value }
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save interests.',
    onError: (message) => {
      interestsHelperText.value = message
    },
  },
)

// Prefill input with current username (if any) once, so "case-only" edits are obvious.
watch(
  () => authUser.value?.username ?? null,
  (u) => {
    if (usernameInput.value.trim()) return
    if (!u) return
    usernameInput.value = u
  },
  { immediate: true }
)

const canSaveUsername = computed(() => {
  const trimmed = usernameInput.value.trim()
  if (!trimmed) return false
  // Allow capitalization-only changes regardless of current validation rules.
  if (isCaseOnlyChange.value) return true
  // If username is set, only capitalization is allowed.
  if (usernameLocked.value) return false
  return usernameStatus.value === 'available'
})

const { save: saveUsernameRequest, saving, saved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const username = usernameInput.value.trim()
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/username', {
      method: 'PATCH',
      body: { username },
    })

    // Update client auth state with latest user data.
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save username.',
    onError: (message) => {
      usernameHelperText.value = message
    },
  },
)

const followVisibilityOptions: Array<{ label: string; value: FollowVisibility }> = [
  { label: 'Public (anyone)', value: 'all' },
  { label: 'Verified members', value: 'verified' },
  { label: 'Premium members', value: 'premium' },
  { label: 'Only me', value: 'none' }
]
const birthdayVisibilityOptions: Array<{ label: string; value: BirthdayVisibility }> = [
  { label: 'Hide birthday', value: 'none' },
  { label: 'Month and day only', value: 'monthDay' },
  { label: 'Full birthday (with year)', value: 'full' },
]

const followVisibilityInput = ref<FollowVisibility>('all')
const birthdayVisibilityInput = ref<BirthdayVisibility>('monthDay')
const privacyError = ref<string | null>(null)

watch(
  () => authUser.value?.followVisibility,
  (v) => {
    const next = (v || 'all') as FollowVisibility
    followVisibilityInput.value = next
  },
  { immediate: true }
)

watch(
  () => authUser.value?.birthdayVisibility,
  (v) => {
    const next = (v || 'monthDay') as BirthdayVisibility
    birthdayVisibilityInput.value = next
  },
  { immediate: true }
)

const privacyDirty = computed(() =>
  (authUser.value?.followVisibility || 'all') !== followVisibilityInput.value ||
  (authUser.value?.birthdayVisibility || 'monthDay') !== birthdayVisibilityInput.value
)

const { save: savePrivacyRequest, saving: privacySaving, saved: privacySaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: {
        followVisibility: followVisibilityInput.value,
        birthdayVisibility: birthdayVisibilityInput.value,
      }
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save privacy.',
    onError: (message) => {
      privacyError.value = message
    },
  },
)

// Premium+ steward badge toggle
const stewardBadgeEnabledInput = ref<boolean>(true)
const stewardBadgeError = ref<string | null>(null)

watch(
  () => authUser.value?.stewardBadgeEnabled,
  (v) => {
    // ON by default when field is missing (defensive).
    stewardBadgeEnabledInput.value = v !== false
  },
  { immediate: true },
)

const stewardBadgeDirty = computed(() => (authUser.value?.stewardBadgeEnabled ?? true) !== stewardBadgeEnabledInput.value)

const { save: saveStewardBadgeRequest, saving: stewardBadgeSaving, saved: stewardBadgeSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: { stewardBadgeEnabled: stewardBadgeEnabledInput.value }
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save steward badge.',
    onError: (message) => {
      stewardBadgeError.value = message
    },
  },
)

watch(usernameInput, () => {
  // Clear "Saved" when they edit the field.
  saved.value = false
})

async function save() {
  usernameHelperText.value = null

  const username = usernameInput.value.trim()
  if (!username) return

  if (usernameLocked.value && !isCaseOnlyChange.value) {
    usernameStatus.value = 'invalid'
    usernameHelperText.value = 'Only capitalization changes are allowed for your username.'
    return
  }

  saved.value = false
  await saveUsernameRequest()
}

async function saveEmail() {
  emailHelperText.value = null
  emailSaved.value = false
  await saveEmailRequest()
}

async function saveProfileDetails() {
  profileDetailsHelperText.value = null
  profileDetailsSaved.value = false
  await saveProfileDetailsRequest()
}

async function saveInterests() {
  interestsHelperText.value = null
  interestsSaved.value = false
  await saveInterestsRequest()
}

async function savePrivacy() {
  privacyError.value = null
  privacySaved.value = false
  await savePrivacyRequest()
}

async function saveStewardBadge() {
  stewardBadgeError.value = null
  stewardBadgeSaved.value = false
  await saveStewardBadgeRequest()
}

function sendFeedback() {
  const subject = encodeURIComponent(`${siteConfig.name} Feedback`)
  const href = `mailto:feedback@menofhunger.com?subject=${subject}`
  if (import.meta.client) window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

