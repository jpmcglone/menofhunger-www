<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[60] bg-white/95 dark:bg-black/90"
  >
    <!-- Scroll container so small screens can complete onboarding -->
    <div class="h-full w-full overflow-y-auto">
      <div class="min-h-full flex items-start sm:items-center justify-center p-4 sm:py-8">
        <div class="w-full max-w-xl">
          <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]">
            <div class="shrink-0 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-xl font-bold tracking-tight">Finish setting up your profile</div>
                <div class="mt-1 text-sm moh-text-muted">
                  {{ subtitle }}
                </div>
              </div>
            </div>

            <!-- Add bottom padding so iOS safe-area doesn't cover the action row -->
            <div class="mt-5 space-y-4 overflow-y-auto min-h-0 pr-1 -mr-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <AppUsernameField
            v-model="usernameInput"
            tone="moh"
            :status="usernameStatus"
            :helper-text="usernameHelp"
            :disabled="submitting"
            placeholder="username"
          >
            <template #label>
              <label class="text-sm font-medium moh-text">
                Username<span class="ml-0.5">*</span>
              </label>
            </template>
          </AppUsernameField>

          <AppFormField label="Display name" optional tone="moh">
            <InputText v-model="name" class="w-full" placeholder="Name" :disabled="submitting" />
          </AppFormField>

          <AppFormField label="Email" optional tone="moh" helper="Optional. Helps us reach you for account support.">
            <InputText v-model="email" type="email" class="w-full" placeholder="you@example.com" autocomplete="email" :disabled="submitting" />
          </AppFormField>

          <div class="space-y-2">
            <label class="text-sm font-medium moh-text">
              Birthday<span v-if="!birthdateLocked" class="ml-0.5">*</span>
            </label>
            <InputText v-if="!birthdateLocked" v-model="birthdate" type="date" class="w-full" :disabled="submitting" />
            <div v-else class="w-full rounded-xl border moh-border px-3 py-2 text-sm moh-text">
              {{ birthdatePretty }}
            </div>
            <div class="text-xs moh-text-muted">
              <span v-if="birthdateLocked">Birthday is locked once set.</span>
              <span v-else>Must be 18+ to join.</span>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-baseline justify-between gap-3">
              <label class="text-sm font-medium moh-text">
                Interests<span class="ml-0.5">*</span>
              </label>
              <div class="text-xs moh-text-muted">Pick at least 1</div>
            </div>
            <AppInterestsPicker
              v-model="interests"
              :disabled="submitting"
              label=""
              helper-right=""
              helper-bottom=""
              description="Search, pick from suggestions, or add your own."
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium moh-text">
              Community<span v-if="!menConfirmLocked" class="ml-0.5">*</span>
            </label>
            <!-- Make the whole row tappable (fixes iOS delayed visual updates). -->
            <button
              type="button"
              class="flex w-full items-start gap-3 text-left"
              :disabled="submitting || menConfirmLocked"
              @click="toggleMenOnlyConfirmed"
            >
              <Checkbox
                :modelValue="menOnlyConfirmed"
                binary
                inputId="moh-men-only"
                :disabled="submitting || menConfirmLocked"
                @click.stop
                @update:modelValue="(v) => (menOnlyConfirmed = Boolean(v))"
              />
              <div class="text-sm moh-text leading-snug">
                I understand Men of Hunger is a men’s community, and I’m joining as a man.
                <div class="mt-1 text-xs moh-text-muted">
                  You can browse right away. Posting and messaging require verification first.
                </div>
              </div>
            </button>
          </div>

          <div v-if="error" class="text-sm text-red-700 dark:text-red-300">
            {{ error }}
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <div class="text-xs moh-text-muted">Profile setup is required to continue.</div>
            <Button
              label="Continue"
              :loading="submitting"
              :disabled="submitting || !canSubmit"
              @click="submit"
            >
              <template #icon>
                <Icon name="tabler:check" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateOnly } from '~/utils/time-format'

const { user, ensureLoaded } = useAuth()
const { apiFetchData } = useApiClient()
const route = useRoute()

await ensureLoaded()

const show = computed(() => {
  const u = user.value
  if (!u?.id) return false
  const needsUsername = !u.usernameIsSet
  const needsBirthdate = !u.birthdate
  const needsInterests = !Array.isArray(u.interests) || u.interests.length < 1
  const needsMenConfirm = !u.menOnlyConfirmed
  return needsUsername || needsBirthdate || needsInterests || needsMenConfirm
})

const missingParts = computed(() => {
  const u = user.value
  if (!u?.id) return []
  const parts: string[] = []
  if (!u.usernameIsSet) parts.push('a username')
  if (!u.birthdate) parts.push('your birthday')
  if (!Array.isArray(u.interests) || u.interests.length < 1) parts.push('at least one interest')
  if (!u.menOnlyConfirmed) parts.push('a quick confirmation')
  return parts
})

function formatList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

const subtitle = computed(() => {
  const parts = missingParts.value
  if (parts.length === 0) return 'You’re all set.'
  return `Before you continue, we need ${formatList(parts)}.`
})

const usernameInput = ref('')
const birthdate = ref('')
const interests = ref<string[]>([])
const name = ref('')
const email = ref('')
const menOnlyConfirmed = ref(false)

const usernameLocked = computed(() => Boolean(user.value?.usernameIsSet))
const birthdateLocked = computed(() => Boolean(user.value?.birthdate))
const menConfirmLocked = computed(() => Boolean(user.value?.menOnlyConfirmed))

const currentUsername = computed(() => (user.value?.username ?? '').trim())

const birthdatePretty = computed(() => {
  const raw = (user.value?.birthdate ?? '').slice(0, 10)
  if (!raw) return '—'
  return formatDateOnly(`${raw}T00:00:00.000Z`, {
    dateOptions: { year: 'numeric', month: 'long', day: 'numeric' },
    fallback: raw,
  })
})

watch(
  () => user.value,
  (u) => {
    if (!u) return
    if (!usernameInput.value.trim() && u.username) usernameInput.value = u.username
    if (!birthdate.value && u.birthdate) birthdate.value = u.birthdate.slice(0, 10)
    if (interests.value.length === 0 && Array.isArray(u.interests)) interests.value = u.interests
    if (!name.value && u.name) name.value = u.name
    if (!email.value && u.email) email.value = u.email
    if (!menOnlyConfirmed.value && u.menOnlyConfirmed) menOnlyConfirmed.value = true
  },
  { immediate: true, deep: true },
)

const {
  status: usernameStatus,
  helperText: usernameHelp,
  isCaseOnlyChange: usernameIsCaseOnly,
} = useUsernameField({
  value: usernameInput,
  currentUsername,
  usernameIsSet: usernameLocked,
  debounceMs: 450,
  lockedInvalidMessage: 'Username can’t be changed here. Only capitalization is allowed.',
  caseOnlyMessage: () => {
    const trimmed = usernameInput.value.trim()
    return trimmed === currentUsername.value ? 'Username is set.' : 'Only capitalization changes are allowed (this change is OK).'
  },
})

const error = ref<string | null>(null)
const submitting = ref(false)

const canSubmit = computed(() => {
  if (!menConfirmLocked.value && menOnlyConfirmed.value !== true) return false
  const needsUsername = !user.value?.usernameIsSet
  if (needsUsername) {
    if (!usernameInput.value.trim()) return false
    if (usernameStatus.value !== 'available') return false
  } else {
    // Username is set; allow only case-only edits (or unchanged).
    if (!usernameInput.value.trim()) return false
    if (!usernameIsCaseOnly.value) return false
  }
  if (!birthdateLocked.value && !birthdate.value) return false
  if (!birthdateLocked.value && birthdate.value && !isBirthdate18Plus(birthdate.value)) return false
  if (!Array.isArray(interests.value) || interests.value.length < 1) return false
  return true
})

function isBirthdate18Plus(yyyyMmDd: string): boolean {
  const raw = (yyyyMmDd ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false
  const d = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false

  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const cutoff = new Date(Date.UTC(todayUtc.getUTCFullYear() - 18, todayUtc.getUTCMonth(), todayUtc.getUTCDate()))
  return d.getTime() <= cutoff.getTime()
}

function toggleMenOnlyConfirmed() {
  if (submitting.value || menConfirmLocked.value) return
  menOnlyConfirmed.value = !menOnlyConfirmed.value
}

async function submit() {
  if (!canSubmit.value) return
  if (!birthdateLocked.value && birthdate.value && !isBirthdate18Plus(birthdate.value)) {
    error.value = 'You must be at least 18 years old to join Men of Hunger.'
    return
  }
  submitting.value = true
  error.value = null
  try {
    // If username is already set and they changed only capitalization, save it via the username endpoint.
    const trimmedUsername = usernameInput.value.trim()
    if (usernameLocked.value && trimmedUsername && trimmedUsername !== currentUsername.value && usernameIsCaseOnly.value) {
      const ures = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/username', {
        method: 'PATCH',
        body: { username: trimmedUsername },
      })
      user.value = ures.user ?? user.value
    }

    const payload: Record<string, unknown> = {
      interests: interests.value,
      name: name.value.trim() ? name.value.trim() : undefined,
      email: email.value.trim() ? email.value.trim() : '',
    }
    if (!user.value?.usernameIsSet) payload.username = usernameInput.value.trim()
    if (!birthdateLocked.value) payload.birthdate = birthdate.value
    if (!menConfirmLocked.value) payload.menOnlyConfirmed = Boolean(menOnlyConfirmed.value)

    const res = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/onboarding', {
      method: 'PATCH',
      body: payload,
    })
    user.value = res.user ?? user.value

    // Post-signup: once onboarding is complete, send them to their profile (preserve capitalization).
    if (route.query.welcome === '1') {
      const username = (user.value?.username ?? '').trim()
      if (username) {
        await navigateTo(`/u/${encodeURIComponent(username)}`)
      }
    }
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to save. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
