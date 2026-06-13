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
              <SettingsAccountSection
                v-if="showsBlock('account')"
                :email-verification-ui-ready="emailVerificationUiReady"
              />

              <SettingsVerificationSection
                v-if="showsBlock('verification')"
                :show-divider="composedBlocks.length > 1"
              />

              <SettingsBillingSection v-if="showsBlock('billing')" />

              <SettingsPrivacySection v-if="showsBlock('privacy')" />

              <SettingsNotificationsSection v-if="showsBlock('notifications')" />

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

              <div v-if="showsBlock('marv')" class="space-y-4">
                <SettingsMarvSection />
              </div>

              <div v-if="showsBlock('danger')" class="space-y-4">
                <div class="border-t moh-border pt-6 -mt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Danger zone
                  </div>
                </div>
                <SettingsDangerZoneSection />
              </div>

              <div v-if="composedBlocks.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
                Choose a section from the left.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import SettingsAccountSection from '~/components/settings/sections/SettingsAccountSection.vue'
import SettingsVerificationSection from '~/components/settings/sections/SettingsVerificationSection.vue'
import SettingsBillingSection from '~/components/settings/sections/SettingsBillingSection.vue'
import SettingsPrivacySection from '~/components/settings/sections/SettingsPrivacySection.vue'
import SettingsNotificationsSection from '~/components/settings/sections/SettingsNotificationsSection.vue'
import SettingsDangerZoneSection from '~/components/settings/sections/SettingsDangerZoneSection.vue'

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

// Top-level Settings has five sections:
//   account              — username, email, profile, location, interests, verification, useful links
//   notifications        — push permission + per-event notification matrix
//   privacy              — visibility settings + blocked users
//   billing              — Premium subscription management
//   marv                 — AI helper preferences
// The previous narrower keys (`verification`, `blocked`, `links`) are kept as
// "blocks" that the merged sections compose (see `composedBlocks` below) and
// as legacy URL aliases that redirect to their new home.
type SettingsSection = 'account' | 'notifications' | 'privacy' | 'billing' | 'marv'
type SettingsBlock =
  | 'account'
  | 'verification'
  | 'billing'
  | 'privacy'
  | 'notifications'
  | 'blocked'
  | 'links'
  | 'marv'
  | 'danger'

const { ensureLoaded, me } = useAuth()
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

const allowedSections: SettingsSection[] = ['account', 'notifications', 'privacy', 'billing', 'marv']

// Old narrower URL keys redirect into one of the top-level sections.
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

// Redirect aliased URLs to their canonical section home so the URL bar
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
  },
  {
    key: 'marv' as const,
    label: 'M.A.R.V (AI helper)',
    description: 'Preferred reply mode, credits, and recent activity.'
  }
])

// Each top-level section is composed from one or more "blocks" (the original
// narrower sections). Rendering them as independent `v-if` siblings (instead of
// a single `v-if/v-else-if` chain) lets us mount multiple blocks under one URL.
const sectionToBlocks: Record<SettingsSection, ReadonlyArray<SettingsBlock>> = {
  account: ['account', 'verification', 'links', 'danger'],
  notifications: ['notifications'],
  privacy: ['privacy', 'blocked'],
  billing: ['billing'],
  marv: ['marv'],
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
</script>
