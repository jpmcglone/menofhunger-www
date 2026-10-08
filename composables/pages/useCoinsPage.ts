import { formatCount } from '~/utils/number-format'
import { formatLocaleDate, formatLocaleDateTime } from '~/utils/time-format'
import type { FollowListUser, CoinTransferItem, TransferCoinsResponse  } from '~/types/api'

export function useCoinsPage() {
usePageSeo({ title: 'Coins', description: 'Send and receive coins on Men of Hunger.', noindex: true })


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
const {
  transfers,
  nextCursor,
  loading: isLoadingHistory,
  loaded: historyLoaded,
  error: historyError,
  refresh: loadTransfers,
  loadMore,
} = useCoinTransfers()

onMounted(() => {
  if (!canUseCoins.value) return
  void loadTransfers()
})

// --- Formatting ---
function fmt(n: number) { return formatCount(n) }

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
  return formatLocaleDate(new Date(iso), { month: 'short', day: 'numeric' })
}

function shortDateTime(iso: string): string {
  const d = new Date(iso)
  return formatLocaleDateTime(d, {
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
  return {
    onPreview,
    onCancel,
    onConfirm,
    onSendAnother,
    setMax,
    fmt,
    relativeTime,
    shortDateTime,
    isPositiveDirection,
    activityVerb,
    activityIcon,
    activityTone,
    activityBubbleTone,
    activityStreakTone,
    canUseCoins,
    sendOpen,
    step,
    recipient,
    amount,
    note,
    formError,
    displayCoins,
    maxAmount,
    balanceAfter,
    successResult,
    transfers,
    nextCursor,
    isLoadingHistory,
    historyLoaded,
    historyError,
    loadMore,
  }
}
