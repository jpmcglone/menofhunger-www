<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-white/95 backdrop-blur-sm dark:bg-black/90"
  >
    <div class="w-full max-w-xl px-4">
      <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xl font-bold tracking-tight">Finish setting up your profile</div>
            <div class="mt-1 text-sm moh-text-muted">
              {{ subtitle }}
            </div>
          </div>
        </div>

        <div class="mt-5 space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium moh-text">
              Username<span class="ml-0.5">*</span>
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm moh-text-muted">@</span>
              <InputText
                v-model="usernameInput"
                class="w-full !pl-10"
                placeholder="username"
                autocomplete="off"
                :disabled="submitting"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                <i v-if="checkingUsername" class="pi pi-spin pi-spinner moh-text-muted" aria-hidden="true" />
                <i v-else-if="usernameStatus === 'available'" class="pi pi-check text-green-600" aria-hidden="true" />
                <i v-else-if="usernameStatus === 'taken' || usernameStatus === 'invalid'" class="pi pi-times text-red-600" aria-hidden="true" />
              </div>
            </div>
            <div v-if="usernameHelp" class="text-sm" :class="usernameHelpToneClass">
              {{ usernameHelp }}
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium moh-text">Display name <span class="font-normal moh-text-muted">(Optional)</span></label>
            <InputText v-model="name" class="w-full" placeholder="Name" :disabled="submitting" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium moh-text">Email <span class="font-normal moh-text-muted">(Optional)</span></label>
            <InputText v-model="email" type="email" class="w-full" placeholder="you@example.com" autocomplete="email" :disabled="submitting" />
            <div class="text-xs moh-text-muted">Optional. Helps us reach you for account support.</div>
          </div>

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
            <button
              type="button"
              class="w-full rounded-xl border moh-border p-3 text-left transition-colors moh-surface-hover"
              :disabled="submitting"
              @click="openInterestsDialog"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-semibold moh-text">
                    {{ interests.length > 0 ? `${interests.length} selected` : 'Select interests' }}
                  </div>
                  <div class="mt-1 text-xs moh-text-muted">
                    Search and pick tags that describe what you’re into. (Pick at least one.)
                  </div>
                </div>
                <i class="pi pi-angle-right moh-text-muted" aria-hidden="true" />
              </div>

              <div v-if="interests.length > 0" class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="v in interests"
                  :key="v"
                  class="inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-none"
                  :style="interestChipStyle(v)"
                >
                  {{ interestLabel(v) }}
                </span>
              </div>
            </button>
            <div class="text-xs moh-text-muted">We’ll use these later to personalize your experience.</div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium moh-text">
              Community<span v-if="!menConfirmLocked" class="ml-0.5">*</span>
            </label>
            <div class="flex items-start gap-3">
              <Checkbox v-model="menOnlyConfirmed" binary inputId="moh-men-only" :disabled="submitting || menConfirmLocked" />
              <label for="moh-men-only" class="text-sm moh-text leading-snug">
                I understand Men of Hunger is a men’s community, and I’m joining as a man.
                <div class="mt-1 text-xs moh-text-muted">
                  You can browse right away. Posting and messaging require verification first.
                </div>
              </label>
            </div>
          </div>

          <div v-if="error" class="text-sm text-red-700 dark:text-red-300">
            {{ error }}
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <div class="text-xs moh-text-muted">Profile setup is required to continue.</div>
            <Button
              label="Continue"
              icon="pi pi-check"
              :loading="submitting"
              :disabled="submitting || !canSubmit"
              @click="submit"
            />
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="interestsDialogOpen"
      modal
      header="Select interests"
      :dismissableMask="true"
      class="w-[min(680px,calc(100vw-2rem))]"
    >
      <div class="space-y-3">
        <div class="text-sm moh-text-muted">
          Pick tags you’d want other guys to find you by. You can change these later.
        </div>

        <InputText v-model="interestQuery" class="w-full" placeholder="Search interests…" />

        <!-- Keep dialog height stable while filtering by reserving full-list space. -->
        <div class="pt-1">
          <div class="relative max-h-[45vh] overflow-y-auto">
            <!-- Ghost layer (in normal flow) preserves height; invisible + non-interactive. -->
            <div aria-hidden="true" class="flex flex-wrap justify-center gap-2 opacity-0 pointer-events-none select-none">
              <span
                v-for="opt in interestOptions"
                :key="`ghost-${opt.value}`"
                class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold"
              >
                <span>{{ opt.label }}</span>
              </span>
            </div>

            <!-- Real layer (absolute) renders filtered + animated tags. -->
            <div class="absolute inset-0">
              <TransitionGroup name="moh-interest" tag="div" class="flex flex-wrap justify-center gap-2">
                <button
                  v-for="opt in filteredInterestOptions"
                  :key="opt.value"
                  type="button"
                  class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
                  :class="draftInterests.includes(opt.value) ? 'bg-transparent' : 'moh-surface-hover'"
                  :style="
                    draftInterests.includes(opt.value)
                      ? { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)' }
                      : { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
                  "
                  @click="toggleInterest(opt.value)"
                >
                  <span>{{ opt.label }}</span>
                </button>
              </TransitionGroup>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 pt-2">
          <div class="text-xs moh-text-muted">
            {{ draftInterests.length }} selected
            <span v-if="draftInterests.length === 0"> · pick at least one</span>
          </div>
          <div class="flex items-center gap-2">
            <Button label="Cancel" severity="secondary" text @click="closeInterestsDialog" />
            <Button label="Done" icon="pi pi-check" :disabled="draftInterests.length < 1" @click="commitInterestsDialog" />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import { interestOptions } from '~/config/interests'

type UsernameStatus = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid'

const { user, ensureLoaded } = useAuth()
const { apiFetchData } = useApiClient()
const { check } = useUsernameAvailability()

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
const interestsDialogOpen = ref(false)
const interestQuery = ref('')
const draftInterests = ref<string[]>([])

const usernameLocked = computed(() => Boolean(user.value?.usernameIsSet))
const birthdateLocked = computed(() => Boolean(user.value?.birthdate))
const menConfirmLocked = computed(() => Boolean(user.value?.menOnlyConfirmed))

const currentUsername = computed(() => (user.value?.username ?? '').trim())
const currentUsernameLower = computed(() => currentUsername.value.toLowerCase())
const desiredUsernameLower = computed(() => usernameInput.value.trim().toLowerCase())
const usernameIsCaseOnly = computed(() => {
  const cur = currentUsernameLower.value
  const desired = desiredUsernameLower.value
  if (!cur || !desired) return false
  return cur === desired
})

const birthdatePretty = computed(() => {
  const raw = (user.value?.birthdate ?? '').slice(0, 10)
  if (!raw) return '—'
  try {
    const d = new Date(`${raw}T00:00:00.000Z`)
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
  } catch {
    return raw
  }
})

const interestLabelMap = computed(() => {
  const m = new Map<string, string>()
  for (const opt of interestOptions) m.set(opt.value, opt.label)
  return m
})

function interestLabel(value: string): string {
  return interestLabelMap.value.get(value) ?? value
}

function interestChipStyle(value: string): Record<string, string> {
  // Keep chips consistent with current primary tint (verified/premium/default).
  // Clear background; colored border/text for a subtle tag look.
  if (!value) {
    return { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
  }
  return { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)', backgroundColor: 'transparent' }
}

const filteredInterestOptions = computed(() => {
  const q = interestQuery.value.trim().toLowerCase()
  if (!q) return interestOptions
  return interestOptions.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
})

function toggleInterest(value: string) {
  const next = new Set(draftInterests.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  draftInterests.value = Array.from(next)
}

function openInterestsDialog() {
  if (submitting.value) return
  interestQuery.value = ''
  draftInterests.value = [...interests.value]
  interestsDialogOpen.value = true
}

function closeInterestsDialog() {
  interestsDialogOpen.value = false
}

function commitInterestsDialog() {
  interests.value = [...draftInterests.value]
  closeInterestsDialog()
}

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

const usernameStatus = ref<UsernameStatus>('unknown')
const usernameHelp = ref<string | null>(null)
const error = ref<string | null>(null)
const submitting = ref(false)

const checkingUsername = computed(() => usernameStatus.value === 'checking')
const usernameHelpToneClass = computed(() => {
  if (usernameStatus.value === 'available') return 'text-green-700 dark:text-green-300'
  if (usernameStatus.value === 'taken' || usernameStatus.value === 'invalid') return 'text-red-700 dark:text-red-300'
  return 'moh-text-muted'
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function checkUsernameAvailability(username: string) {
  usernameStatus.value = 'checking'
  usernameHelp.value = null
  const res = await check(username)
  usernameStatus.value = res.status
  usernameHelp.value = res.message
}

watch(
  usernameInput,
  (v) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    usernameHelp.value = null
    usernameStatus.value = 'unknown'
    error.value = null

    const trimmed = v.trim()
    if (!trimmed) return

    // If username is already set, only allow capitalization changes.
    if (usernameLocked.value) {
      if (!currentUsernameLower.value) {
        // Shouldn't happen if usernameIsSet=true, but be safe.
        usernameStatus.value = 'invalid'
        usernameHelp.value = 'Username is required.'
        return
      }

      if (!usernameIsCaseOnly.value) {
        usernameStatus.value = 'invalid'
        usernameHelp.value = 'Username can’t be changed here. Only capitalization is allowed.'
        return
      }

      // Case-only is OK. If they changed capitalization, we’ll save it on submit.
      usernameStatus.value = 'available'
      usernameHelp.value =
        trimmed === currentUsername.value
          ? 'Username is set.'
          : 'Only capitalization changes are allowed (this change is OK).'
      return
    }

    debounceTimer = setTimeout(() => void checkUsernameAvailability(trimmed), 450)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

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
      const ures = await apiFetchData<{ user: any }>('/users/me/username', {
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

    const res = await apiFetchData<{ user: any }>('/users/me/onboarding', {
      method: 'PATCH',
      body: payload,
    })
    user.value = res.user ?? user.value
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to save. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.moh-interest-enter-active,
.moh-interest-leave-active {
  transition: all 160ms ease;
}
.moh-interest-move {
  /* FLIP transition for reordering within <TransitionGroup> */
  transition: transform 160ms ease;
}
.moh-interest-leave-active {
  /* Prevent layout snapping while items leave */
  position: absolute;
}
.moh-interest-enter-from,
.moh-interest-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

