<script setup lang="ts">
definePageMeta({ layout: 'app', title: 'Coin Receipt', ssr: false, hideTopBar: true })

import type { CoinTransferItem, CoinTransferReceipt } from '~/types/api'

const route = useRoute()
const { apiFetchData, apiFetch } = useApiClient()

const transferId = computed(() => String(route.params.transferId ?? '').trim())
const receipt = ref<CoinTransferReceipt | null>(null)
const fallbackTransfer = ref<CoinTransferItem | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

function fmtAmount(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(Number(n) || 0)))
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isPositiveDirection(direction: CoinTransferReceipt['direction']): boolean {
  return direction === 'received' || direction === 'admin_added' || direction === 'streak_reward' || direction === 'verification_gift'
}

function activityIcon(direction: CoinTransferReceipt['direction']): string {
  if (direction === 'streak_reward') return 'tabler:flame'
  if (direction === 'verification_gift') return 'tabler:rosette-discount-check'
  if (direction === 'received') return 'tabler:arrow-down'
  if (direction === 'sent') return 'tabler:arrow-up'
  if (direction === 'admin_added') return 'tabler:plus'
  return 'tabler:minus'
}

function activityTone(direction: CoinTransferReceipt['direction']): string {
  return isPositiveDirection(direction)
    ? 'text-green-600 dark:text-green-400'
    : 'text-amber-600 dark:text-amber-400'
}

function bubbleTone(direction: CoinTransferReceipt['direction']): string {
  if (direction === 'streak_reward') return 'bg-orange-100 dark:bg-orange-900/30'
  if (direction === 'verification_gift') return 'bg-blue-100 dark:bg-blue-900/30'
  return isPositiveDirection(direction) ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
}

function receiptLabel(direction: CoinTransferReceipt['direction']): string {
  if (direction === 'streak_reward') return 'Streak reward'
  if (direction === 'verification_gift') return 'Welcome gift'
  if (direction === 'admin_added') return 'Admin adjustment (added)'
  if (direction === 'admin_removed') return 'Admin adjustment (removed)'
  return 'Amount'
}

async function loadTransferFromHistoryById(id: string): Promise<CoinTransferItem | null> {
  let cursor: string | null = null
  let rounds = 0
  while (rounds < 12) {
    rounds += 1
    const res: { data: CoinTransferItem[]; pagination?: { nextCursor?: string | null } } = await apiFetch<CoinTransferItem[]>('/coins/transfers', {
      method: 'GET',
      query: cursor ? { cursor, limit: 50 } : { limit: 50 },
    })
    const items = Array.isArray(res.data) ? res.data : []
    const found = items.find((t) => t.id === id)
    if (found) return found
    const nextCursor = res.pagination?.nextCursor ?? null
    if (!nextCursor) return null
    cursor = nextCursor
  }
  return null
}

async function loadReceipt() {
  if (!transferId.value) {
    error.value = 'Transfer not found.'
    isLoading.value = false
    return
  }
  isLoading.value = true
  error.value = null
  receipt.value = null
  fallbackTransfer.value = null
  try {
    const data = await apiFetchData<CoinTransferReceipt>(`/coins/transfers/${encodeURIComponent(transferId.value)}`, {
      method: 'GET',
    })
    receipt.value = data
  } catch (e: any) {
    // Fallback path: if dedicated receipt lookup fails, scan the paginated history.
    // This keeps permalink pages useful even when receipt endpoint behavior differs by env.
    try {
      const fromHistory = await loadTransferFromHistoryById(transferId.value)
      if (fromHistory) {
        fallbackTransfer.value = fromHistory
      } else {
        error.value = e?.data?.meta?.errors?.[0]?.message ?? 'Could not find this transfer.'
      }
    } catch {
      error.value = e?.data?.meta?.errors?.[0]?.message ?? 'Could not load this transfer.'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadReceipt()
})
</script>

<template>
  <AppPageContent bottom="standard">
    <div class="mx-auto max-w-xl px-4 pt-4 pb-8 space-y-5">
      <div class="flex items-center justify-between gap-3">
        <NuxtLink
          to="/coins"
          class="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <Icon name="tabler:arrow-left" size="16" />
          Back to Coins
        </NuxtLink>
        <div class="text-xs text-gray-500 dark:text-gray-400">Transaction receipt</div>
      </div>

      <div v-if="isLoading" class="flex justify-center py-12">
        <Icon name="tabler:loader-2" size="24" class="text-gray-400 animate-spin" />
      </div>

      <div
        v-else-if="error"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
      >
        {{ error }}
      </div>

      <div v-else-if="receipt || fallbackTransfer" class="space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white/95 shadow-sm p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="flex items-center gap-3">
            <div class="shrink-0 flex h-10 w-10 items-center justify-center rounded-full" :class="bubbleTone((receipt?.direction ?? fallbackTransfer!.direction) as any)">
              <Icon :name="activityIcon((receipt?.direction ?? fallbackTransfer!.direction) as any)" size="18" :class="activityTone((receipt?.direction ?? fallbackTransfer!.direction) as any)" />
            </div>

            <AppUserAvatar
              v-if="(receipt?.direction ?? fallbackTransfer!.direction) !== 'streak_reward' && (receipt?.direction ?? fallbackTransfer!.direction) !== 'verification_gift'"
              :user="{ id: (receipt?.counterparty.userId ?? fallbackTransfer!.counterparty.userId), username: (receipt?.counterparty.username ?? fallbackTransfer!.counterparty.username), avatarUrl: (receipt?.counterparty.avatarUrl ?? fallbackTransfer!.counterparty.avatarUrl) }"
              size-class="h-9 w-9"
              :show-presence="false"
            />

            <div class="min-w-0 flex-1">
              <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {{ receiptLabel((receipt?.direction ?? fallbackTransfer!.direction) as any) }}
              </div>
              <div class="mt-0.5 text-sm text-gray-900 dark:text-gray-100 truncate">
                <template v-if="(receipt?.direction ?? fallbackTransfer!.direction) === 'streak_reward' || (receipt?.direction ?? fallbackTransfer!.direction) === 'verification_gift'">
                  <span class="font-semibold">
                    {{ (receipt?.counterparty.displayName ?? fallbackTransfer!.counterparty.displayName) || `@${(receipt?.counterparty.username ?? fallbackTransfer!.counterparty.username)}` }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ (receipt?.direction ?? fallbackTransfer!.direction) === 'sent' ? 'To ' : 'From ' }}
                  </span>
                  <NuxtLink
                    v-if="(receipt?.counterparty.username ?? fallbackTransfer!.counterparty.username)"
                    :to="`/u/${encodeURIComponent((receipt?.counterparty.username ?? fallbackTransfer!.counterparty.username) as string)}`"
                    class="font-semibold hover:underline"
                  >
                    @{{ receipt?.counterparty.username ?? fallbackTransfer!.counterparty.username }}
                  </NuxtLink>
                  <span v-else class="font-semibold">
                    {{ receipt?.counterparty.displayName ?? fallbackTransfer!.counterparty.displayName ?? 'System' }}
                  </span>
                </template>
              </div>
              <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ shortDateTime(receipt?.createdAt ?? fallbackTransfer!.createdAt) }} · #{{ receipt?.id ?? fallbackTransfer!.id }}
              </div>
            </div>

            <div class="text-lg font-bold tabular-nums shrink-0" :class="activityTone((receipt?.direction ?? fallbackTransfer!.direction) as any)">
              {{ isPositiveDirection((receipt?.direction ?? fallbackTransfer!.direction) as any) ? '+' : '-' }}{{ fmtAmount(receipt?.amount ?? fallbackTransfer!.amount) }}
            </div>
          </div>
        </div>

        <div
          v-if="(receipt?.note ?? fallbackTransfer?.note) && (receipt?.direction ?? fallbackTransfer!.direction) !== 'streak_reward' && (receipt?.direction ?? fallbackTransfer!.direction) !== 'verification_gift'"
          class="rounded-xl border border-gray-200 bg-white/90 shadow-sm p-4 text-sm text-gray-700 italic dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-300"
        >
          "{{ receipt?.note ?? fallbackTransfer?.note }}"
        </div>
      </div>
    </div>
  </AppPageContent>
</template>
