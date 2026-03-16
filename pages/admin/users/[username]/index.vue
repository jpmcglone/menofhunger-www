<template>
  <div class="space-y-5 pb-12">
    <!-- Loading -->
    <div v-if="loading" class="px-4 py-16 flex justify-center">
      <AppLogoLoader :size="64" />
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="px-4">
      <AppInlineAlert severity="danger">{{ loadError }}</AppInlineAlert>
    </div>

    <template v-else-if="user">
      <!-- Banner + identity header (mirrors /u/:username structure) -->
      <div class="relative">
        <div class="group relative aspect-[3.25/1] w-full bg-gray-200 dark:bg-zinc-900">
          <img
            v-if="user.bannerUrl"
            v-show="!hideBannerThumb"
            :src="user.bannerUrl"
            alt="User banner"
            class="h-full w-full object-cover"
          />
          <div
            v-if="user.bannerUrl"
            v-show="!hideBannerThumb"
            class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
            aria-hidden="true"
          />
          <button
            v-if="user.bannerUrl"
            v-show="!hideBannerThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View banner"
            @click="onOpenProfileImage({ event: $event, url: user.bannerUrl, title: 'Banner', kind: 'banner' })"
          />
        </div>
        <div
          :class="[
            'absolute left-4 bottom-0 translate-y-1/2 z-20 overflow-visible transition-opacity duration-200',
            hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100',
          ]"
        >
          <div ref="avatarWrapperRef" class="relative ring-4 ring-white dark:ring-black rounded-full">
            <AppUserAvatar
              v-show="!hideAvatarThumb"
              :user="user"
              size-class="h-24 w-24"
              bg-class="bg-gray-200 dark:bg-zinc-800"
              :presence-scale="0.15"
              :presence-inset-ratio="0.25"
            />
            <button
              v-if="user.avatarUrl"
              v-show="!hideAvatarThumb"
              type="button"
              class="absolute inset-0 cursor-zoom-in"
              aria-label="View avatar"
              @click="onAvatarClick"
            />
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-3xl px-4 pb-4 pt-14">
        <div class="flex items-start justify-between gap-4 mt-1">
          <div class="min-w-0">
            <div class="flex items-center gap-2 min-w-0 flex-wrap">
              <div class="text-xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
                {{ user.name || user.username || 'User' }}
              </div>
              <Tag v-if="user.bannedAt" value="Banned" severity="danger" class="!text-xs" />
              <Tag v-if="user.siteAdmin" value="Admin" severity="warn" class="!text-xs" />
              <AppVerifiedBadge
                :status="user.verifiedStatus"
                :premium="user.premium"
                :premium-plus="user.premiumPlus"
                :is-organization="user.isOrganization"
                :steward-badge-enabled="user.stewardBadgeEnabled ?? true"
              />
            </div>
            <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="user.username">@{{ user.username }}</span>
              <span v-else class="italic">username not set</span>
              <span class="mx-1">&middot;</span>
              <span>Joined {{ formatDateTime(user.createdAt) }}</span>
            </div>
            <div v-if="user.bio" class="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{{ user.bio }}</div>
          </div>

          <div class="shrink-0 flex items-center gap-2 flex-wrap justify-end">
            <Button
              v-if="user.username"
              label="View profile"
              severity="secondary"
              outlined
              size="small"
              @click="navigateTo(`/u/${encodeURIComponent(user.username)}`)"
            />
            <Button
              :label="user.bannedAt ? 'Unban' : 'Ban'"
              :severity="user.bannedAt ? 'secondary' : 'danger'"
              :loading="banSaving"
              :disabled="banSaving || user.siteAdmin"
              size="small"
              @click="user.bannedAt ? unbanUser() : banUser()"
            />
            <Button
              label="Unverify email"
              severity="secondary"
              size="small"
              :disabled="!user.email || !user.emailVerifiedAt || actionSaving"
              :loading="actionSaving"
              @click="unverifyEmail"
            />
          </div>
        </div>
      </div>

      <!-- Sensitive fields -->
      <div class="px-4">
        <div class="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Sensitive fields</div>
            <Button
              :label="sensitiveRevealed ? 'Revealed' : 'Reveal'"
              :disabled="sensitiveRevealed || revealLoading"
              :loading="revealLoading"
              size="small"
              severity="secondary"
              @click="revealSensitive"
            />
          </div>
          <div class="grid gap-2 sm:grid-cols-3 text-sm">
            <div class="rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2">
              <div class="text-xs text-gray-500 dark:text-gray-400">Phone</div>
              <div class="font-mono">{{ displayPhone }}</div>
            </div>
            <div class="rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2">
              <div class="text-xs text-gray-500 dark:text-gray-400">Email</div>
              <div class="font-mono break-all">{{ displayEmail || 'None' }}</div>
            </div>
            <div class="rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2">
              <div class="text-xs text-gray-500 dark:text-gray-400">Birthdate</div>
              <div class="font-mono">{{ displayBirthdate || 'None' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit user -->
      <div class="px-4">
        <div class="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Edit user</div>
          <AppInlineAlert v-if="editError" severity="danger">{{ editError }}</AppInlineAlert>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <label class="text-xs text-gray-500 dark:text-gray-400">Phone</label>
              <InputText v-model="editPhone" class="w-full font-mono" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-gray-500 dark:text-gray-400">Username</label>
              <InputText v-model="editUsername" class="w-full font-mono" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-gray-500 dark:text-gray-400">Name</label>
              <InputText v-model="editName" class="w-full" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-gray-500 dark:text-gray-400">Verified status</label>
              <Select
                v-model="editVerifiedStatus"
                class="w-full"
                option-label="label"
                option-value="value"
                :options="verifiedStatusOptions"
              />
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-xs text-gray-500 dark:text-gray-400">Bio</label>
            <Textarea v-model="editBio" class="w-full" auto-resize rows="3" />
          </div>
          <div class="space-y-1">
            <label class="text-xs text-gray-500 dark:text-gray-400">Feature toggles</label>
            <MultiSelect
              v-model="editFeatureToggles"
              :options="APP_FEATURE_TOGGLE_OPTIONS"
              option-label="label"
              option-value="value"
              display="chip"
              class="w-full"
              placeholder="None enabled"
            />
            <div v-if="selectedFeatureToggleOptions.length > 0" class="flex flex-wrap gap-2 pt-1">
              <button
                v-for="opt in selectedFeatureToggleOptions"
                :key="opt.value"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border moh-border bg-gray-50 dark:bg-zinc-900 px-2 py-1 text-xs"
                @click="removeFeatureToggle(opt.value)"
              >
                <span>{{ opt.label }}</span>
                <Icon name="tabler:x" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox v-model="editIsOrganization" binary input-id="edit-is-org" />
            <label for="edit-is-org" class="text-sm text-gray-700 dark:text-gray-200">Organization account</label>
          </div>
          <div class="flex items-center justify-end gap-2">
            <Button label="Save changes" size="small" :loading="editSaving" :disabled="editSaving" @click="saveEdit" />
          </div>
          <div class="mt-2 rounded-xl border border-gray-200 dark:border-zinc-800 p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Coins</div>
              <div class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Icon name="tabler:coin" size="16" aria-hidden="true" />
                <span class="text-lg font-bold tabular-nums">{{ (user?.coins ?? 0).toLocaleString() }}</span>
              </div>
            </div>
            <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <InputNumber
                v-model="coinsAdjustAmount"
                input-id="coins-adjust-amount"
                class="w-full"
                :min="1"
                :step="1"
                :use-grouping="false"
                placeholder="Amount"
              />
              <InputText
                v-model="coinsAdjustReason"
                class="w-full"
                maxlength="200"
                placeholder="Reason (optional)"
              />
              <Button
                label="Add"
                severity="success"
                :loading="coinsAdjustSaving"
                :disabled="coinsAdjustSaving || !coinsAdjustAmount || coinsAdjustAmount < 1"
                @click="adjustCoins(1)"
              />
              <Button
                label="Remove"
                severity="danger"
                :loading="coinsAdjustSaving"
                :disabled="coinsAdjustSaving || !coinsAdjustAmount || coinsAdjustAmount < 1"
                @click="adjustCoins(-1)"
              />
            </div>
            <AppInlineAlert v-if="coinsAdjustError" severity="danger">{{ coinsAdjustError }}</AppInlineAlert>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Creates a transparent activity event showing who added or removed coins.
            </div>
          </div>
        </div>
      </div>

      <!-- Recent cards -->
      <div class="px-4 grid gap-4 lg:grid-cols-3">
        <!-- Posts -->
        <div class="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Recent posts</div>
            <Button text size="small" label="View all" @click="navigateTo(`/admin/users/${encodedUsername}/posts`)" />
          </div>
          <div v-if="recentPosts.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No posts yet.</div>
          <NuxtLink
            v-for="p in recentPosts"
            :key="p.id"
            :to="`/p/${encodeURIComponent(p.id)}`"
            class="block rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
          >
            <div class="text-sm line-clamp-2 text-gray-800 dark:text-gray-100">{{ p.body }}</div>
            <div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ formatDateTime(p.createdAt) }}</span>
              <span>&middot;</span>
              <span class="inline-flex items-center gap-1"><Icon name="tabler:message-circle" aria-hidden="true" />{{ p.commentCount }}</span>
              <span class="inline-flex items-center gap-1"><Icon name="tabler:arrow-up" aria-hidden="true" />{{ p.boostCount }}</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Articles -->
        <div class="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Recent articles</div>
            <Button text size="small" label="View all" @click="navigateTo(`/admin/users/${encodedUsername}/articles`)" />
          </div>
          <div v-if="recentArticles.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No articles yet.</div>
          <NuxtLink
            v-for="a in recentArticles"
            :key="a.id"
            :to="`/a/${encodeURIComponent(a.id)}`"
            :class="[
              'relative flex items-center gap-3 rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2 transition-colors',
              compactArticleHoverClass(a.visibility),
            ]"
          >
            <div :class="['absolute right-0 top-0 bottom-0 w-[3px] rounded-r', compactArticleAccentBarClass(a.visibility)]" aria-hidden="true" />
            <div class="min-w-0 flex-1 pr-2">
              <div class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{{ a.title || 'Untitled' }}</div>
              <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(a.createdAt) }}</div>
            </div>
          </NuxtLink>
        </div>

        <!-- Searches -->
        <div class="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Recent searches</div>
            <Button text size="small" label="View all" @click="navigateTo(`/admin/users/${encodedUsername}/searches`)" />
          </div>
          <div v-if="recentSearches.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No searches yet.</div>
          <div v-for="s in recentSearches" :key="s.id" class="text-sm border-b border-gray-100 dark:border-zinc-800 pb-2 last:border-b-0">
            <div class="font-mono line-clamp-1">{{ s.query }}</div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(s.createdAt) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { APP_FEATURE_TOGGLE_OPTIONS, type AppFeatureToggle } from '~/config/app-feature-toggles'
import type {
  AdminAdjustCoinsResult,
  AdminUserDetailData,
  AdminUserSensitiveFields,
  AdminUserRecentArticle,
  AdminUserRecentPost,
  AdminUserRecentSearch,
} from '~/types/api'

definePageMeta({
  layout: 'app',
  title: 'User 360',
  middleware: 'admin',
})

const route = useRoute()
const username = computed(() => String(route.params.username ?? '').trim())
const encodedUsername = computed(() => encodeURIComponent(username.value))
const avatarWrapperRef = ref<HTMLElement | null>(null)

usePageSeo({
  title: 'Admin user 360',
  description: 'Admin user overview and management.',
  canonicalPath: computed(() => `/admin/users/${encodedUsername.value}`),
  noindex: true,
})

const { apiFetchData } = useApiClient()
const viewer = useImageLightbox()
const { openFromEvent } = viewer

const loading = ref(true)
const loadError = ref<string | null>(null)
const user = ref<AdminUserDetailData | null>(null)

const revealLoading = ref(false)
const sensitiveRevealed = ref(false)
const revealedSensitive = ref<AdminUserSensitiveFields | null>(null)

const editPhone = ref('')
const editUsername = ref('')
const editName = ref('')
const editBio = ref('')
const editVerifiedStatus = ref<'none' | 'identity' | 'manual'>('none')
const editIsOrganization = ref(false)
const editFeatureToggles = ref<AppFeatureToggle[]>([])
const editSaving = ref(false)
const editError = ref<string | null>(null)
const coinsAdjustAmount = ref<number | null>(null)
const coinsAdjustReason = ref('')
const coinsAdjustSaving = ref(false)
const coinsAdjustError = ref<string | null>(null)

const actionSaving = ref(false)
const banSaving = ref(false)

const recentPosts = ref<AdminUserRecentPost[]>([])
const recentArticles = ref<AdminUserRecentArticle[]>([])
const recentSearches = ref<AdminUserRecentSearch[]>([])

const verifiedStatusOptions: Array<{ label: string; value: 'none' | 'identity' | 'manual' }> = [
  { label: 'None', value: 'none' },
  { label: 'Identity', value: 'identity' },
  { label: 'Manual', value: 'manual' },
]
const selectedFeatureToggleOptions = computed(() =>
  APP_FEATURE_TOGGLE_OPTIONS.filter((opt) => editFeatureToggles.value.includes(opt.value)),
)
const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const displayPhone = computed(() => (sensitiveRevealed.value ? (revealedSensitive.value?.phone ?? user.value?.phone ?? '') : (user.value?.sensitive.phone ?? '')))
const displayEmail = computed(() => (sensitiveRevealed.value ? (revealedSensitive.value?.email ?? user.value?.email ?? null) : (user.value?.sensitive.email ?? null)))
const displayBirthdate = computed(() =>
  sensitiveRevealed.value ? (revealedSensitive.value?.birthdate ?? user.value?.birthdate ?? null) : (user.value?.sensitive.birthdate ?? null),
)

function onOpenProfileImage(payload: {
  event: MouseEvent
  url: string
  title: string
  kind: 'avatar' | 'banner'
  isOrganization?: boolean
  originRect?: { left: number; top: number; width: number; height: number }
}) {
  void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
    ...(payload.kind === 'avatar' && { avatarBorderRadius: payload.isOrganization ? '16%' : '9999px' }),
    originRect: payload.originRect,
  })
}

function onAvatarClick(event: MouseEvent) {
  const url = user.value?.avatarUrl ?? null
  if (!url) return
  const rect = avatarWrapperRef.value?.getBoundingClientRect()
  onOpenProfileImage({
    event,
    url,
    title: 'Avatar',
    kind: 'avatar',
    isOrganization: Boolean(user.value?.isOrganization),
    originRect: rect
      ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      : undefined,
  })
}

function mergeUserUpdate(updated: AdminUserDetailData): AdminUserDetailData {
  const current = user.value
  return { ...updated, sensitive: current?.sensitive ?? updated.sensitive, canRevealSensitive: current?.canRevealSensitive ?? updated.canRevealSensitive }
}

function removeFeatureToggle(value: AppFeatureToggle) {
  editFeatureToggles.value = editFeatureToggles.value.filter((entry) => entry !== value)
}

function compactArticleAccentBarClass(visibility: string) {
  if (visibility === 'premiumOnly') return 'bg-orange-500'
  if (visibility === 'verifiedOnly') return 'bg-blue-500'
  return 'bg-transparent'
}

function compactArticleHoverClass(visibility: string) {
  if (visibility === 'premiumOnly') return 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
  if (visibility === 'verifiedOnly') return 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
  return 'hover:bg-gray-50 dark:hover:bg-white/5'
}

function resetEditForm() {
  const current = user.value
  if (!current) return
  editPhone.value = current.phone ?? ''
  editUsername.value = current.username ?? ''
  editName.value = current.name ?? ''
  editBio.value = current.bio ?? ''
  editVerifiedStatus.value = current.verifiedStatus
  editIsOrganization.value = Boolean(current.isOrganization)
  editFeatureToggles.value = Array.isArray(current.featureToggles)
    ? current.featureToggles
        .map((v) => String(v ?? '').trim())
        .filter((v): v is AppFeatureToggle => APP_FEATURE_TOGGLE_OPTIONS.some((opt) => opt.value === v))
    : []
}

async function loadPage() {
  if (!username.value) {
    loadError.value = 'Username is required.'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const base = `/admin/users/by-username/${encodedUsername.value}`
    const [detail, posts, articles, searches] = await Promise.all([
      apiFetchData<AdminUserDetailData>(base),
      apiFetchData<AdminUserRecentPost[]>(`${base}/recent/posts`, { query: { limit: 5 } }),
      apiFetchData<AdminUserRecentArticle[]>(`${base}/recent/articles`, { query: { limit: 5 } }),
      apiFetchData<AdminUserRecentSearch[]>(`${base}/recent/searches`, { query: { limit: 5 } }),
    ])
    user.value = detail
    recentPosts.value = posts
    recentArticles.value = articles
    recentSearches.value = searches
    sensitiveRevealed.value = false
    revealedSensitive.value = null
    resetEditForm()
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to load user.'
  } finally {
    loading.value = false
  }
}

async function revealSensitive() {
  if (!username.value || revealLoading.value) return
  revealLoading.value = true
  try {
    revealedSensitive.value = await apiFetchData<AdminUserSensitiveFields>(
      `/admin/users/by-username/${encodedUsername.value}/reveal-sensitive`,
      { method: 'POST' },
    )
    sensitiveRevealed.value = true
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to reveal sensitive fields.'
  } finally {
    revealLoading.value = false
  }
}

async function saveEdit() {
  const current = user.value
  if (!current || editSaving.value) return
  editSaving.value = true
  editError.value = null
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/profile`, {
      method: 'PATCH',
      body: {
        phone: editPhone.value.trim(),
        username: editUsername.value.trim() ? editUsername.value.trim() : null,
        name: editName.value.trim() ? editName.value.trim() : null,
        bio: editBio.value.trim() ? editBio.value.trim() : null,
        verifiedStatus: editVerifiedStatus.value,
        isOrganization: editIsOrganization.value,
        featureToggles: editFeatureToggles.value,
      },
    })
    user.value = mergeUserUpdate(updated)
    if (sensitiveRevealed.value) {
      revealedSensitive.value = { phone: updated.phone, email: updated.email, birthdate: updated.birthdate }
    }
  } catch (e: unknown) {
    editError.value = getApiErrorMessage(e) || 'Failed to save user.'
  } finally {
    editSaving.value = false
  }
}

async function adjustCoins(sign: 1 | -1) {
  const current = user.value
  const rawAmount = Math.floor(Number(coinsAdjustAmount.value || 0))
  if (!current || coinsAdjustSaving.value || rawAmount < 1) return
  coinsAdjustSaving.value = true
  coinsAdjustError.value = null
  try {
    const result = await apiFetchData<AdminAdjustCoinsResult>(`/admin/users/${encodeURIComponent(current.id)}/coins/adjust`, {
      method: 'POST',
      body: {
        delta: sign * rawAmount,
        reason: coinsAdjustReason.value.trim() || null,
      },
    })
    user.value = { ...current, coins: result.targetBalanceAfter }
    coinsAdjustAmount.value = null
    coinsAdjustReason.value = ''
  } catch (e: unknown) {
    coinsAdjustError.value = getApiErrorMessage(e) || 'Failed to adjust coins.'
  } finally {
    coinsAdjustSaving.value = false
  }
}

async function unverifyEmail() {
  const current = user.value
  if (!current || !current.email || !current.emailVerifiedAt || actionSaving.value) return
  const ok = window.confirm(
    `Unverify ${current.email}?\n\nThis clears verification and invalidates existing verification links.`,
  )
  if (!ok) return
  actionSaving.value = true
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/email/unverify`, {
      method: 'POST',
    })
    user.value = mergeUserUpdate(updated)
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to unverify email.'
  } finally {
    actionSaving.value = false
  }
}

async function banUser() {
  const current = user.value
  if (!current || banSaving.value) return
  const reason = window.prompt('Ban reason (optional):') ?? ''
  banSaving.value = true
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/ban`, {
      method: 'POST',
      body: { reason: reason.trim() || undefined },
    })
    user.value = mergeUserUpdate(updated)
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to ban user.'
  } finally {
    banSaving.value = false
  }
}

async function unbanUser() {
  const current = user.value
  if (!current || banSaving.value) return
  const ok = window.confirm(`Unban ${current.username ? `@${current.username}` : 'this user'}?`)
  if (!ok) return
  banSaving.value = true
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/unban`, {
      method: 'POST',
    })
    user.value = mergeUserUpdate(updated)
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to unban user.'
  } finally {
    banSaving.value = false
  }
}

watch(
  () => username.value,
  () => {
    void loadPage()
  },
  { immediate: true },
)
</script>
