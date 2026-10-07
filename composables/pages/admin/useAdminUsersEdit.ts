import { APP_FEATURE_TOGGLE_OPTIONS, type AppFeatureToggle } from '~/config/app-feature-toggles'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { useAdminUsersSearch, AdminUser, useAdminUsersAffiliations } from './useAdminUsersPage'
import type { useAdminUsersOperators } from './useAdminUsersOperators'

export type UsernameAvailability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'

/**
 * Username availability, save gating, status labels, opening the editor, bans,
 * email verification, row navigation, and saving.
 */
export function useAdminUsersEdit(ctx: ReturnType<typeof useAdminUsersSearch> & ReturnType<typeof useAdminUsersAffiliations> & ReturnType<typeof useAdminUsersOperators>) {
  const { apiFetch, apiFetchData, results, editOpen, editingUser, editError, emailAdminError, emailAdminSaving, banReason, banSaving, banError, grantError, editPremiumMonths, editPremiumPlusMonths, loadGrants, bannedOpen, bannedQuery, bannedUsers, bannedLoading, bannedError, unbanLoadingId, editPhone, editUsername, editName, editBio, editVerifiedStatus, editIsOrganization, editFeatureToggles, orgAffs, loadOrgAffs, loadOperators, loadOperatedPages } = ctx

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

  return {
    usernameAvailability,
    usernameHelperText,
    usernameHelperToneClass,
    canSave,
    verifiedOptions,
    membershipLabel,
    membershipSeverity,
    verificationStatusLabel,
    verificationStatusSeverity,
    verificationVerifiedAtLabel,
    verificationUnverifiedAtLabel,
    joinedAtLabel,
    emailVerifiedAtLabel,
    emailVerificationRequestedAtLabel,
    openEdit,
    toggleBannedOpen,
    refreshBannedUsers,
    unbanUser,
    banEditingUser,
    unbanEditingUser,
    unverifyEmail,
    onUserRowClick,
    saveUser,
    saving,
  }
}
