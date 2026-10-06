<template>
  <span class="receipt inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums" :class="[`receipt--${tone}`, everyone && 'receipt--all']" :title="description" :aria-label="description" role="img">
    <Transition name="receipt-swap" mode="out-in">
      <span :key="status" class="inline-flex items-center gap-1">
        <Icon :name="icon" class="size-3.5" :class="status === 'sending' && 'receipt-spin'" aria-hidden="true" />
        <span v-if="label" class="receipt-label">{{ label }}</span>
      </span>
    </Transition>
  </span>
</template>
<script setup lang="ts">
const props = defineProps<{
  status: 'sending' | 'sent' | 'failed' | 'read'
  readCount?: number
  recipientCount?: number
  /** Newest own message: spell the state out instead of showing icon and count only. */
  expanded?: boolean
}>()
const everyone = computed(() => props.status === 'read' && !!props.recipientCount && props.readCount === props.recipientCount)
const tone = computed(() => props.status === 'read' ? 'read' : props.status === 'failed' ? 'failed' : 'quiet')
const icon = computed(() => ({ sending: 'tabler:loader-2', sent: 'tabler:check', failed: 'tabler:alert-circle', read: 'tabler:checks' })[props.status])
const label = computed(() => {
  if (props.status === 'sending') return 'Sending'
  if (props.status === 'failed') return ''
  if (props.status === 'sent') return props.expanded ? 'Sent' : ''
  return props.expanded && !everyone.value ? `Read by ${props.readCount}` : String(props.readCount)
})
const description = computed(() => {
  if (props.status === 'sending') return 'Sending'
  if (props.status === 'failed') return 'Couldn’t send'
  if (props.status === 'sent') return 'Sent'
  return `Read by ${props.readCount} of ${props.recipientCount} ${props.recipientCount === 1 ? 'member' : 'members'}`
})
</script>
<style scoped>
.receipt { transition: color 0.45s ease, background-color 0.45s ease; }
.receipt-swap-enter-active { transition: opacity 0.38s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.receipt-swap-leave-active { transition: opacity 0.26s ease-in, transform 0.26s ease-in; }
.receipt-swap-enter-from { opacity: 0; transform: scale(0.6); }
.receipt-swap-leave-to { opacity: 0; transform: scale(0.85); }
@media (prefers-reduced-motion: reduce) { .receipt, .receipt-swap-enter-active, .receipt-swap-leave-active { transition: none; } }
.receipt--quiet { color: var(--moh-text-soft); }
.receipt--failed { color: #c62828; }
.receipt--read { color: rgb(var(--moh-brass-rgb)); }
.receipt--all { background: rgba(var(--moh-brass-rgb), 0.14); }
.receipt-spin { animation: receipt-spin 1s linear infinite; }
@keyframes receipt-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .receipt-spin { animation: none; } }
:global(html.dark) .receipt--failed { color: #f87171; }
</style>
