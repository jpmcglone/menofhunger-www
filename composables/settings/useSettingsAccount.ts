import type { AuthUser } from '~/composables/useAuth'
import { useFormSave } from '~/composables/useFormSave'
import { useSyncUserCaches } from '~/composables/settings/useSyncUserCaches'
import { getApiErrorMessage } from '~/utils/api-error'

const EMAIL_RESEND_COOLDOWN_SECONDS = 30

/**
 * State + save actions for the "Your account" settings block:
 * username, email (incl. verification resend cooldown), profile details
 * (ZIP / website), and interests.
 */
export function useSettingsAccount() {
  const { user: authUser, me } = useAuth()
  const { apiFetchData } = useApiClient()
  const syncUserCaches = useSyncUserCaches()

  // ─── Username ───────────────────────────────────────────────────────

  const usernameInput = ref('')
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

  // Prefill input with current username (if any) once, so "case-only" edits are obvious.
  watch(
    () => authUser.value?.username ?? null,
    (u) => {
      if (usernameInput.value.trim()) return
      if (!u) return
      usernameInput.value = u
    },
    { immediate: true },
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
      const result = await apiFetchData<{ user: AuthUser }>('/users/me/username', {
        method: 'PATCH',
        body: { username },
      })
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

  // ─── Email ──────────────────────────────────────────────────────────

  const emailInput = ref('')
  const emailHelperText = ref<string | null>(null)
  const emailResendSaving = ref(false)
  const emailResendSaved = ref(false)
  const emailResendError = ref<string | null>(null)
  let emailResendSavedTimer: ReturnType<typeof setTimeout> | null = null
  const emailResendUiHydrated = ref(false)
  const emailResendNowMs = ref<number>(Date.now())
  let emailResendTickTimer: ReturnType<typeof setInterval> | null = null

  watch(
    () => authUser.value?.email ?? null,
    (v) => {
      if (emailInput.value.trim()) return
      if (typeof v !== 'string' || !v.trim()) return
      emailInput.value = v
    },
    { immediate: true },
  )

  const emailDirty = computed(() => {
    const current = (authUser.value?.email ?? '').trim().toLowerCase()
    const desired = emailInput.value.trim().toLowerCase()
    return current !== desired
  })

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

  onBeforeUnmount(() => {
    if (emailResendTickTimer) {
      clearInterval(emailResendTickTimer)
      emailResendTickTimer = null
    }
    if (emailResendSavedTimer) {
      clearTimeout(emailResendSavedTimer)
      emailResendSavedTimer = null
    }
  })

  const { save: saveEmailRequest, saving: emailSaving, saved: emailSaved } = useFormSave(
    async () => {
      const previousUsername = authUser.value?.username ?? null
      const raw = emailInput.value.trim()
      const body = { email: raw ? raw : '' }
      const result = await apiFetchData<{ user: AuthUser }>('/users/me/profile', {
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

  async function saveEmail() {
    emailHelperText.value = null
    emailSaved.value = false
    await saveEmailRequest()
  }

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

  // ─── Profile details (ZIP + website) ────────────────────────────────

  const locationQueryInput = ref('')
  const websiteInput = ref('')
  const profileDetailsHelperText = ref<string | null>(null)

  watch(
    () => authUser.value?.locationZip ?? null,
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

  const profileDetailsDirty = computed(() => {
    const currentLocation = (authUser.value?.locationZip ?? '').trim().toLowerCase()
    const desiredLocation = locationQueryInput.value.trim().toLowerCase()
    if (currentLocation !== desiredLocation) return true

    const currentWebsite = (authUser.value?.website ?? '').trim().toLowerCase()
    const desiredWebsite = websiteInput.value.trim().toLowerCase()
    return currentWebsite !== desiredWebsite
  })

  const {
    save: saveProfileDetailsRequest,
    saving: profileDetailsSaving,
    saved: profileDetailsSaved,
  } = useFormSave(
    async () => {
      const previousUsername = authUser.value?.username ?? null
      const result = await apiFetchData<{ user: AuthUser }>('/users/me/profile', {
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

  async function saveProfileDetails() {
    profileDetailsHelperText.value = null
    profileDetailsSaved.value = false
    await saveProfileDetailsRequest()
  }

  // ─── Interests ──────────────────────────────────────────────────────

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
      const result = await apiFetchData<{ user: AuthUser }>('/users/me/profile', {
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

  async function saveInterests() {
    interestsHelperText.value = null
    interestsSaved.value = false
    await saveInterestsRequest()
  }

  return {
    // username
    usernameInput,
    usernameStatus,
    usernameHelperText,
    canSaveUsername,
    saving,
    saved,
    save,
    // email
    emailInput,
    emailHelperText,
    emailDirty,
    emailSaving,
    emailSaved,
    saveEmail,
    emailResendSaving,
    emailResendSaved,
    emailResendError,
    emailResendCooldownActive,
    emailResendButtonLabel,
    resendEmailVerification,
    // profile details
    locationQueryInput,
    websiteInput,
    profileDetailsHelperText,
    profileDetailsDirty,
    profileDetailsSaving,
    profileDetailsSaved,
    saveProfileDetails,
    // interests
    interestsInput,
    interestsHelperText,
    interestsDirty,
    interestsSaving,
    interestsSaved,
    saveInterests,
  }
}
