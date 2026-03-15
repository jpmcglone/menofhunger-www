<script setup lang="ts">
definePageMeta({ layout: 'app', title: 'Coin Receipt', ssr: false, hideTopBar: true })

import type { CoinTransferReceipt } from '~/types/api'

const route = useRoute()
const { apiFetchData } = useApiClient()

const transferId = computed(() => String(route.params.transferId ?? '').trim())
const receipt = ref<CoinTransferReceipt | null>(null)
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
  return direction === 'received' || direction === 'admin_added'
}

function receiptLabel(direction: CoinTransferReceipt['direction']): string {
  if (direction === 'admin_added') return 'Admin adjustment (added)'
  if (direction === 'admin_removed') return 'Admin adjustment (removed)'
  return 'Amount'
}

async function loadReceipt() {
  if (!transferId.value) {
    error.value = 'Transfer not found.'
    isLoading.value = false
    return
  }
  isLoading.value = true
  error.value = null
  try {
    const data = await apiFetchData<CoinTransferReceipt>(`/coins/transfers/${encodeURIComponent(transferId.value)}`, {
      method: 'GET',
    })
    receipt.value = data
  } catch (e: any) {
    error.value = e?.data?.meta?.errors?.[0]?.message ?? 'Could not load this receipt.'
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

      <div v-else-if="receipt" class="space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white/95 shadow-sm p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ receiptLabel(receipt.direction) }}</div>
          <div
            class="mt-1 text-3xl font-bold tabular-nums"
            :class="isPositiveDirection(receipt.direction) ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'"
          >
            {{ isPositiveDirection(receipt.direction) ? '+' : '-' }}{{ fmtAmount(receipt.amount) }}
          </div>
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ shortDateTime(receipt.createdAt) }}</div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">Receipt #{{ receipt.id }}</div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white/95 shadow-sm p-4 space-y-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Parties</div>

          <div class="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5">
            <AppUserAvatar
              :user="{ id: receipt.sender.userId, username: receipt.sender.username, avatarUrl: receipt.sender.avatarUrl }"
              size-class="h-9 w-9"
              :show-presence="false"
            />
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-500 dark:text-gray-400">From</div>
              <NuxtLink
                v-if="receipt.sender.username"
                :to="`/u/${receipt.sender.username}`"
                class="font-semibold text-gray-900 dark:text-gray-100 hover:underline truncate"
              >
                {{ receipt.sender.displayName?.trim() || `@${receipt.sender.username}` }}
              </NuxtLink>
              <div v-else class="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ receipt.sender.displayName || 'Unknown user' }}
              </div>
            </div>
            <NuxtLink
              v-if="receipt.sender.username"
              :to="`/u/${receipt.sender.username}`"
              class="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Profile
              <Icon name="tabler:chevron-right" size="14" />
            </NuxtLink>
          </div>

          <div class="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5">
            <AppUserAvatar
              :user="{ id: receipt.recipient.userId, username: receipt.recipient.username, avatarUrl: receipt.recipient.avatarUrl }"
              size-class="h-9 w-9"
              :show-presence="false"
            />
            <div class="min-w-0 flex-1">
              <div class="text-xs text-gray-500 dark:text-gray-400">To</div>
              <NuxtLink
                v-if="receipt.recipient.username"
                :to="`/u/${receipt.recipient.username}`"
                class="font-semibold text-gray-900 dark:text-gray-100 hover:underline truncate"
              >
                {{ receipt.recipient.displayName?.trim() || `@${receipt.recipient.username}` }}
              </NuxtLink>
              <div v-else class="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ receipt.recipient.displayName || 'Unknown user' }}
              </div>
            </div>
            <NuxtLink
              v-if="receipt.recipient.username"
              :to="`/u/${receipt.recipient.username}`"
              class="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Profile
              <Icon name="tabler:chevron-right" size="14" />
            </NuxtLink>
          </div>
        </div>

        <div
          v-if="receipt.note"
          class="rounded-xl border border-gray-200 bg-white/90 shadow-sm p-4 text-sm text-gray-700 italic dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-300"
        >
          "{{ receipt.note }}"
        </div>
      </div>
    </div>
  </AppPageContent>
</template>
