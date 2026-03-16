<script setup lang="ts">
definePageMeta({ layout: 'app', title: 'Coins', ssr: false, hideTopBar: true })

import type { FollowListUser } from '~/types/api'
import type { CoinTransferItem, TransferCoinsResponse } from '~/types/api'

const { user: authUser } = useAuth()
const { apiFetchData } = useApiClient()

const canUseCoins = computed(() => (authUser.value?.verifiedStatus ?? 'none') !== 'none')

// --- Send form state ---
const sendOpen = ref(false)
type Step = 'form' | 'preview' | 'sending' | 'success'
const step = ref<Step>('form')
const recipient = ref<FollowListUser | null>(null)
const amount = ref<number | null>(null)
const note = ref('')
const formError = ref<string | null>(null)

// Track optimistic coin balance (updates after success)
const localCoins = computed(() => authUser.value?.coins ?? 0)
const displayCoins = ref(localCoins.value)
watch(localCoins, (v) => { displayCoins.value = v })

const maxAmount = computed(() => displayCoins.value)
const balanceAfter = computed(() => {
  if (!amount.value || amount.value < 1) return displayCoins.value
  return Math.max(0, displayCoins.value - amount.value)
})

const successResult = ref<TransferCoinsResponse | null>(null)

function validateForm(): string | null {
  if (!canUseCoins.value) return 'Verify your account to use coins.'
  if (!recipient.value) return 'Please select a recipient.'
  if ((recipient.value.verifiedStatus ?? 'none') === 'none') return 'You cannot send coins to unverified users.'
  const amt = amount.value
  if (!amt || !Number.isInteger(amt) || amt < 1) return 'Amount must be at least 1.'
  if (amt > displayCoins.value) return "You don't have enough coins."
  return null
}

function onPreview() {
  formError.value = null
  const err = validateForm()
  if (err) { formError.value = err; return }
  step.value = 'preview'
}

function onCancel() {
  step.value = 'form'
}

async function onConfirm() {
  formError.value = null
  const err = validateForm()
  if (err) { formError.value = err; return }

  step.value = 'sending'

  const sendStart = Date.now()
  try {
    const result = await apiFetchData<TransferCoinsResponse>('/coins/transfer', {
      method: 'POST',
      body: {
        recipientUsername: recipient.value!.username,
        amount: amount.value,
        note: note.value.trim() || null,
      },
    })
    successResult.value = result
    // Enforce minimum 1s "sending" display
    const elapsed = Date.now() - sendStart
    if (elapsed < 1000) await sleep(1000 - elapsed)
    displayCoins.value = result.senderBalanceAfter
    step.value = 'success'
    await loadTransfers()
  } catch (e: any) {
    const msg = e?.data?.meta?.errors?.[0]?.message ?? e?.message ?? 'Something went wrong.'
    formError.value = msg
    step.value = 'form'
  }
}

function onSendAnother() {
  recipient.value = null
  amount.value = null
  note.value = ''
  formError.value = null
  successResult.value = null
  step.value = 'form'
}

function setMax() {
  amount.value = maxAmount.value
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// --- Transaction history ---
const transfers = ref<CoinTransferItem[]>([])
const nextCursor = ref<string | null>(null)
const isLoadingHistory = ref(false)
const historyError = ref<string | null>(null)
const historyLoaded = ref(false)

async function loadTransfers(reset = true) {
  if (isLoadingHistory.value) return
  isLoadingHistory.value = true
  historyError.value = null
  try {
    const cursor = reset ? null : nextCursor.value
    const res = await apiFetchData<CoinTransferItem[]>('/coins/transfers', {
      method: 'GET',
      query: cursor ? { cursor, limit: 20 } : { limit: 20 },
    })
    if (reset) {
      transfers.value = Array.isArray(res) ? res : []
    } else {
      transfers.value = [...transfers.value, ...(Array.isArray(res) ? res : [])]
    }
    // pagination comes back via the envelope — need to use apiFetch directly
    historyLoaded.value = true
  } catch {
    historyError.value = 'Could not load transfer history.'
  } finally {
    isLoadingHistory.value = false
  }
}

async function loadTransfersWithPagination(reset = true) {
  if (isLoadingHistory.value) return
  isLoadingHistory.value = true
  historyError.value = null
  try {
    const cursor = reset ? null : nextCursor.value
    const { apiFetch } = useApiClient()
    const res = await apiFetch<CoinTransferItem[]>('/coins/transfers', {
      method: 'GET',
      query: cursor ? { cursor, limit: 20 } : { limit: 20 },
    })
    const items = Array.isArray(res.data) ? res.data : []
    if (reset) {
      transfers.value = items
    } else {
      transfers.value = [...transfers.value, ...items]
    }
    nextCursor.value = (res as any).pagination?.nextCursor ?? null
    historyLoaded.value = true
  } catch {
    historyError.value = 'Could not load transfer history.'
  } finally {
    isLoadingHistory.value = false
  }
}

function loadMore() {
  loadTransfersWithPagination(false)
}

onMounted(() => {
  if (!canUseCoins.value) return
  loadTransfersWithPagination(true)
})

// --- Formatting ---
const intlFmt = new Intl.NumberFormat('en-US')
function fmt(n: number) { return intlFmt.format(n) }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function shortDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isPositiveDirection(direction: CoinTransferItem['direction']): boolean {
  return direction === 'received' || direction === 'admin_added' || direction === 'streak_reward' || direction === 'verification_gift'
}

function activityVerb(direction: CoinTransferItem['direction']): string {
  if (direction === 'streak_reward') return 'Streak reward'
  if (direction === 'verification_gift') return 'Welcome gift'
  if (direction === 'received') return 'From'
  if (direction === 'sent') return 'To'
  if (direction === 'admin_added') return 'Admin added via'
  return 'Admin removed via'
}

function activityIcon(direction: CoinTransferItem['direction']): string {
  if (direction === 'streak_reward') return 'tabler:flame'
  if (direction === 'verification_gift') return 'tabler:rosette-discount-check'
  if (direction === 'received') return 'tabler:arrow-down'
  if (direction === 'sent') return 'tabler:arrow-up'
  if (direction === 'admin_added') return 'tabler:plus'
  return 'tabler:minus'
}

function activityTone(direction: CoinTransferItem['direction']): string {
  return isPositiveDirection(direction)
    ? 'text-green-600 dark:text-green-400'
    : 'text-amber-600 dark:text-amber-400'
}

function activityBubbleTone(direction: CoinTransferItem['direction']): string {
  if (direction === 'streak_reward') return 'bg-orange-100 dark:bg-orange-900/30'
  if (direction === 'verification_gift') return 'bg-blue-100 dark:bg-blue-900/30'
  return isPositiveDirection(direction)
    ? 'bg-green-100 dark:bg-green-900/30'
    : 'bg-amber-100 dark:bg-amber-900/30'
}

function activityStreakTone(direction: CoinTransferItem['direction']): string {
  if (direction === 'streak_reward') return 'text-orange-500 dark:text-orange-400'
  if (direction === 'verification_gift') return 'text-blue-500 dark:text-blue-400'
  return activityTone(direction)
}
</script>

<template>
  <AppPageContent bottom="standard">
    <div class="mx-auto max-w-xl px-4 pt-4 pb-8 space-y-6">
      <div class="space-y-2">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Coins</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Send coins instantly to verified members you trust.
        </p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white/95 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
            <Icon name="tabler:shield-check" size="13" />
            Verified recipients only
          </span>
          <span class="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300">
            <Icon name="tabler:bolt" size="13" />
            Instant transfer
          </span>
          <span class="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <Icon name="tabler:alert-triangle" size="13" />
            Final - no reversal
          </span>
        </div>
      </div>

      <!-- Balance header -->
      <div
        v-if="canUseCoins"
        class="rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/90 to-white p-5 shadow-sm dark:border-amber-700/40 dark:from-amber-900/20 dark:to-transparent dark:bg-transparent"
      >
        <div class="flex items-center justify-center gap-3">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 ring-1 ring-amber-200/70 dark:bg-amber-900/40 dark:ring-amber-700/40">
            <Icon name="tabler:coin" size="36" class="text-amber-600 dark:text-amber-400" />
          </div>
          <div class="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">
            {{ fmt(displayCoins) }}
          </div>
        </div>
      </div>
      <div
        v-else
        class="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-5 text-center shadow-sm dark:border-amber-700/40 dark:bg-amber-900/20"
      >
        <div class="text-lg font-semibold text-amber-800 dark:text-amber-200">Coins are for verified members</div>
        <div class="mt-1 text-sm text-amber-700 dark:text-amber-300">Verify your account to unlock coin features.</div>
      </div>

      <template v-if="canUseCoins">
        <!-- Send coins (collapsible) -->
        <div class="rounded-2xl border border-gray-200 bg-white/95 shadow-sm overflow-visible dark:border-white/10 dark:bg-white/[0.03]">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          @click="sendOpen = !sendOpen"
        >
          <div class="flex items-center gap-2">
            <Icon name="tabler:send" size="18" class="text-amber-500" />
            <span class="font-semibold text-gray-900 dark:text-gray-100 text-sm">Send Coins</span>
          </div>
          <Icon
            name="tabler:chevron-down"
            size="18"
            class="moh-text-muted transition-transform duration-200"
            :class="sendOpen ? 'rotate-180' : ''"
          />
        </button>

        <Transition name="send-coins-collapse">
          <div v-if="sendOpen" class="border-t border-gray-200 dark:border-white/10">
            <!-- Step: Form -->
            <div v-if="step === 'form'" class="px-4 pt-4 pb-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Recipient</label>
              <AppUserPickerInput v-model="recipient" placeholder="Search by name or username" :debounce-ms="240" />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Unverified users are disabled and cannot receive coins.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Amount</label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <Icon name="tabler:coin" size="16" class="text-amber-500" />
                  </div>
                  <input
                    v-model.number="amount"
                    type="number"
                    min="1"
                    :max="maxAmount"
                    step="1"
                    placeholder="0"
                    class="w-full pl-9 pr-3 py-2.5 rounded-xl border moh-border moh-surface moh-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:focus:ring-amber-400/40 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
                <button
                  type="button"
                  class="px-3 py-2 text-xs font-semibold rounded-xl border moh-border moh-text-muted hover:moh-text transition-colors whitespace-nowrap"
                  :disabled="maxAmount === 0"
                  @click="setMax"
                >
                  Max {{ fmt(maxAmount) }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Note <span class="text-xs font-normal text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <textarea
                v-model="note"
                maxlength="140"
                rows="2"
                placeholder="What's this for?"
                class="w-full px-3 py-2.5 rounded-xl border moh-border moh-surface moh-text text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:focus:ring-amber-400/40 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
              />
              <div class="text-right text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {{ note.length }}/140
              </div>
            </div>

            <p v-if="formError" class="text-sm text-red-500 dark:text-red-400">{{ formError }}</p>

            <button
              type="button"
              class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!recipient || !amount || amount < 1 || recipient.verifiedStatus === 'none'"
              @click="onPreview"
            >
              Preview
            </button>
          </div>

          <!-- Step: Preview -->
          <div v-else-if="step === 'preview'" class="px-4 pt-4 pb-5 space-y-4">
            <div class="rounded-xl border border-amber-200/70 bg-amber-50/70 dark:border-amber-700/40 dark:bg-amber-900/10 p-4 space-y-3">
              <div class="flex items-center gap-3">
                <AppUserAvatar
                  :user="{ id: recipient!.id, username: recipient!.username, avatarUrl: recipient!.avatarUrl, isOrganization: recipient!.isOrganization }"
                  size-class="h-10 w-10"
                  :show-presence="false"
                />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {{ recipient!.name?.trim() || `@${recipient!.username}` }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">@{{ recipient!.username }}</div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-amber-200/70 dark:border-amber-700/40">
                <span class="text-sm text-gray-600 dark:text-gray-400">Sending</span>
                <span class="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Icon name="tabler:coin" size="16" />
                  {{ fmt(amount!) }} {{ amount === 1 ? 'coin' : 'coins' }}
                </span>
              </div>

              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Your balance after</span>
                <span class="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{{ fmt(balanceAfter) }}</span>
              </div>

              <div v-if="note.trim()" class="text-sm text-gray-600 dark:text-gray-400 italic border-t border-amber-200/70 dark:border-amber-700/40 pt-2">
                "{{ note.trim() }}"
              </div>
            </div>

            <p v-if="formError" class="text-sm text-red-500 dark:text-red-400">{{ formError }}</p>

            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl border moh-border moh-text font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                @click="onCancel"
              >
                Cancel
              </button>
              <button
                type="button"
                class="flex-[2] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors"
                @click="onConfirm"
              >
                Confirm & Send
              </button>
            </div>
          </div>

          <!-- Step: Sending -->
          <div v-else-if="step === 'sending'" class="px-4 py-10 flex flex-col items-center gap-3">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40">
              <Icon name="tabler:coin" size="32" class="text-amber-500 animate-spin" style="animation-duration: 1.2s" />
            </div>
            <p class="text-sm font-medium moh-text-muted">Sending coins&hellip;</p>
          </div>

          <!-- Step: Success -->
          <div v-else-if="step === 'success'" class="px-4 py-8 flex flex-col items-center gap-3 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <Icon name="tabler:circle-check" size="32" class="text-green-500 dark:text-green-400" />
            </div>
            <div>
              <div class="font-semibold moh-text">
                Sent {{ fmt(successResult?.amount ?? 0) }} {{ (successResult?.amount ?? 0) === 1 ? 'coin' : 'coins' }}!
              </div>
              <div class="text-sm moh-text-muted mt-0.5">
                to @{{ successResult?.recipientUsername }}
              </div>
            </div>
            <div class="flex gap-3 mt-2">
              <button
                type="button"
                class="px-4 py-2 rounded-xl border moh-border text-sm font-medium moh-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                @click="onSendAnother"
              >
                Send another
              </button>
            </div>
            </div>
          </div>
        </Transition>
        </div>

        <!-- Recent activity -->
        <div>
        <h2 class="font-semibold text-gray-900 dark:text-gray-100 text-base mb-3">Recent Activity</h2>

        <div v-if="isLoadingHistory && !historyLoaded" class="flex justify-center py-8">
          <Icon name="tabler:loader-2" size="24" class="text-gray-400 animate-spin" />
        </div>

        <div v-else-if="historyError" class="text-sm text-red-500 dark:text-red-400 py-4 text-center">
          {{ historyError }}
        </div>

        <div v-else-if="transfers.length === 0 && historyLoaded" class="text-sm text-gray-600 dark:text-gray-400 text-center py-8 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
          No coin activity yet. Post something to start your streak!
        </div>

        <div v-else class="space-y-2">
          <NuxtLink
            v-for="t in transfers"
            :key="t.id"
            :to="`/coins/${t.id}`"
            class="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white/95 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
          >
            <div
              class="shrink-0 flex h-9 w-9 items-center justify-center rounded-full"
              :class="activityBubbleTone(t.direction)"
            >
              <Icon
                :name="activityIcon(t.direction)"
                size="18"
                :class="activityStreakTone(t.direction)"
              />
            </div>

            <AppUserAvatar
              v-if="t.direction !== 'streak_reward' && t.direction !== 'verification_gift'"
              :user="{ id: t.counterparty.userId, username: t.counterparty.username, avatarUrl: t.counterparty.avatarUrl }"
              size-class="h-8 w-8"
              :show-presence="false"
              class="shrink-0"
            />

            <div class="min-w-0 flex-1">
              <div class="text-sm text-gray-900 dark:text-gray-100">
                <template v-if="t.direction === 'streak_reward' || t.direction === 'verification_gift'">
                  <span class="font-semibold">{{ activityVerb(t.direction) }}</span>
                  <span v-if="t.note && t.direction !== 'verification_gift'" class="text-gray-600 dark:text-gray-400"> · {{ t.note }}</span>
                </template>
                <template v-else>
                  <span class="text-gray-600 dark:text-gray-400">{{ activityVerb(t.direction) }} </span>
                  <NuxtLink
                    v-if="t.counterparty.username"
                    :to="`/u/${t.counterparty.username}`"
                    class="font-semibold text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    @{{ t.counterparty.username }}
                  </NuxtLink>
                  <span v-else class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ t.counterparty.displayName || 'System' }}
                  </span>
                </template>
              </div>
              <div v-if="t.note && t.direction !== 'streak_reward' && t.direction !== 'verification_gift'" class="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5 italic">
                "{{ t.note }}"
              </div>
              <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {{ relativeTime(t.createdAt) }} · {{ shortDateTime(t.createdAt) }}
              </div>
            </div>

            <div
              class="text-sm font-bold tabular-nums shrink-0"
              :class="activityTone(t.direction)"
            >
              {{ isPositiveDirection(t.direction) ? '+' : '-' }}{{ fmt(t.amount) }}
            </div>
            <Icon name="tabler:chevron-right" size="16" class="shrink-0 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NuxtLink>

          <div v-if="nextCursor" class="pt-2 flex justify-center">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium moh-text-muted hover:moh-text border moh-border rounded-xl transition-colors disabled:opacity-50"
              :disabled="isLoadingHistory"
              @click="loadMore"
            >
              <span v-if="isLoadingHistory" class="flex items-center gap-1.5">
                <Icon name="tabler:loader-2" size="14" class="animate-spin" />
                Loading&hellip;
              </span>
              <span v-else>Load more</span>
            </button>
          </div>
        </div>
        </div>
      </template>

      <div v-else class="text-center text-xs text-gray-500 dark:text-gray-400">
        Unverified members cannot send, receive, or view coin transfers.
      </div>

    </div>
  </AppPageContent>
</template>

<style scoped>
.send-coins-collapse-enter-active,
.send-coins-collapse-leave-active {
  transition:
    max-height 220ms ease,
    opacity 180ms ease;
  overflow: hidden;
}

.send-coins-collapse-enter-from,
.send-coins-collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.send-coins-collapse-enter-to,
.send-coins-collapse-leave-from {
  max-height: 1000px;
  opacity: 1;
}
</style>
