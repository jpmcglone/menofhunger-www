<template>
  <div class="space-y-6">
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
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="font-medium">Reply nudges</div>
                <div class="text-xs moh-text-muted">One reminder if a reply to your post is still unread after 24 hours.</div>
              </div>
              <Checkbox v-model="notifPrefs.pushReplyNudge" binary :disabled="notifPrefsSaving" />
            </div>
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="font-medium">Crew streak</div>
                <div class="text-xs moh-text-muted">When your crew's streak advances or breaks. The single most important push in the app.</div>
              </div>
              <Checkbox v-model="notifPrefs.pushCrewStreak" binary :disabled="notifPrefsSaving" />
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
                <div class="font-medium">Streak reminder</div>
                <div class="text-xs moh-text-muted">
                  An evening nudge when your check-in streak is at risk.
                </div>
              </div>
              <Checkbox v-model="notifPrefs.emailStreakReminder" binary :disabled="notifPrefsSaving || !emailIsVerified" />
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
</template>

<script setup lang="ts">
import type { ArticleTag, NotificationPreferences, TaxonomyPreference } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { user: authUser } = useAuth()
const { apiFetch, apiFetchData } = useApiClient()
const route = useRoute()

const emailIsVerified = computed(() => Boolean(authUser.value?.email && authUser.value?.emailVerifiedAt))

// ─── Push (browser) ───────────────────────────────────────────────────

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
      method: 'POST',
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

// ─── Notification preferences ─────────────────────────────────────────

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

onMounted(() => {
  void refreshSubscriptionState()
    .catch(() => {})
    .finally(() => {
      pushInitialStateChecked.value = true
    })
  void loadNotifPrefs()
  void loadTagPrefs()
})

onBeforeUnmount(() => {
  if (notifPrefsSavedTimer) {
    clearTimeout(notifPrefsSavedTimer)
    notifPrefsSavedTimer = null
  }
  if (tagPrefsSavedTimer) {
    clearTimeout(tagPrefsSavedTimer)
    tagPrefsSavedTimer = null
  }
})
</script>
