<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x border-b moh-border pt-4 pb-4 flex items-center justify-between gap-2">
      <div>
        <h1 class="moh-h1">Referral Pilot</h1>
        <p class="mt-0.5 text-sm moh-text-muted">Cash earnings by pilot member. Settle when ready to pay out (${{ MIN_PAYOUT }} minimum).</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <AppLogoLoader />
    </div>

    <AppInlineAlert v-else-if="error" severity="danger" class="mx-4 mt-4">{{ error }}</AppInlineAlert>

    <template v-else>
      <!-- Totals summary -->
      <div class="moh-gutter-x pt-5 pb-4 grid grid-cols-3 gap-3 border-b moh-border">
        <div class="rounded-xl border moh-border moh-surface p-4 space-y-1">
          <div class="text-xs moh-text-muted uppercase tracking-wide">Total pending</div>
          <div class="text-xl font-bold moh-text">{{ formatCents(totalPendingCents) }}</div>
        </div>
        <div class="rounded-xl border moh-border moh-surface p-4 space-y-1">
          <div class="text-xs moh-text-muted uppercase tracking-wide">Total settled</div>
          <div class="text-xl font-bold moh-text">{{ formatCents(totalSettledCents) }}</div>
        </div>
        <div class="rounded-xl border moh-border moh-surface p-4 space-y-1">
          <div class="text-xs moh-text-muted uppercase tracking-wide">Total earned</div>
          <div class="text-xl font-bold moh-text">{{ formatCents(totalAllCents) }}</div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="affiliates.length === 0" class="moh-gutter-x py-10 text-sm moh-text-muted">
        No pilot members yet. Enable Referral Pilot on a user's admin page to get started.
      </div>

      <!-- Pilot members list -->
      <div v-else class="divide-y moh-divide">
        <div
          v-for="aff in affiliates"
          :key="aff.userId"
          class="moh-gutter-x py-4 space-y-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <NuxtLink
                :to="`/admin/users/${encodeURIComponent(aff.username ?? aff.userId)}`"
                class="font-semibold moh-text hover:underline"
              >
                {{ aff.name || aff.username || aff.userId }}
              </NuxtLink>
              <div class="text-xs moh-text-muted">
                @{{ aff.username ?? '—' }} · {{ aff.recruitCount }} recruit{{ aff.recruitCount === 1 ? '' : 's' }} · since {{ formatDate(aff.affiliateAt) }}
              </div>
              <div v-if="aff.capReached" class="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                Cap reached (${{ aff.capCents / 100 }})
              </div>
            </div>
            <div class="shrink-0 text-right space-y-0.5">
              <div class="text-sm font-semibold moh-text">{{ formatCents(aff.pendingCents) }} pending</div>
              <div class="text-xs moh-text-muted">{{ formatCents(aff.settledCents) }} settled</div>
              <div class="text-xs moh-text-muted">{{ formatCents(aff.totalCents) }} total</div>
            </div>
          </div>

          <div v-if="aff.pendingCents > 0" class="flex items-center justify-end gap-2">
            <span
              v-if="aff.pendingCents < MIN_PAYOUT_CENTS"
              class="text-xs moh-text-muted"
            >
              Below ${{ MIN_PAYOUT }} minimum
            </span>
            <Button
              label="Mark settled"
              size="small"
              severity="contrast"
              :loading="settlingId === aff.userId"
              :disabled="Boolean(settlingId) || aff.pendingCents < MIN_PAYOUT_CENTS"
              outlined
              @click="settle(aff.userId)"
            />
          </div>
          <AppInlineAlert v-if="settleError[aff.userId]" severity="danger" class="text-xs">{{ settleError[aff.userId] }}</AppInlineAlert>
        </div>
      </div>
    </template>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { AdminAffiliateUser, AdminAffiliateSettle } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'app', title: 'Referral Pilot', middleware: 'admin', ssr: false })

useHead({ title: 'Referral Pilot — Admin' })

const MIN_PAYOUT = 50
const MIN_PAYOUT_CENTS = MIN_PAYOUT * 100

const { apiFetchData } = useApiClient()

const loading = ref(true)
const error = ref<string | null>(null)
const affiliates = ref<AdminAffiliateUser[]>([])
const settlingId = ref<string | null>(null)
const settleError = ref<Record<string, string>>({})

const totalPendingCents = computed(() => affiliates.value.reduce((s, a) => s + a.pendingCents, 0))
const totalSettledCents = computed(() => affiliates.value.reduce((s, a) => s + a.settledCents, 0))
const totalAllCents = computed(() => affiliates.value.reduce((s, a) => s + a.totalCents, 0))

async function load() {
  loading.value = true
  error.value = null
  try {
    affiliates.value = await apiFetchData<AdminAffiliateUser[]>('/admin/affiliates', { method: 'GET' })
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Failed to load pilot members.'
  } finally {
    loading.value = false
  }
}

async function settle(userId: string) {
  if (settlingId.value) return
  settlingId.value = userId
  delete settleError.value[userId]
  try {
    const res = await apiFetchData<AdminAffiliateSettle>(`/admin/affiliates/${encodeURIComponent(userId)}/settle`, { method: 'POST' })
    const aff = affiliates.value.find((a) => a.userId === userId)
    if (aff) {
      aff.settledCents += res.settledCents
      aff.totalCents = aff.pendingCents + aff.settledCents
      aff.pendingCents = 0
    }
  } catch (e) {
    settleError.value[userId] = getApiErrorMessage(e) || 'Failed to settle.'
  } finally {
    settlingId.value = null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

onMounted(() => void load())
onActivated(() => void load())
</script>
