<template>
  <div v-if="canSwitch" :class="compact ? 'pb-1' : 'border-b border-gray-200 dark:border-zinc-700'">
    <div
      :class="compact
        ? 'px-3.5 pt-2.5 pb-1 text-[11px] font-semibold moh-text-muted'
        : 'px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'"
    >
      {{ compact ? 'Accounts' : 'Switch account' }}
    </div>
    <button
      v-for="account in accounts"
      :key="account.id"
      type="button"
      class="moh-tap flex w-full items-center gap-2.5 moh-surface-hover moh-focus text-left"
      :class="compact ? 'px-3.5 py-2' : 'px-5 py-2.5'"
      :disabled="Boolean(switchingId)"
      :aria-current="account.isCurrent ? 'true' : undefined"
      :aria-label="accountActionLabel(account)"
      @click="onPick(account)"
    >
      <AppUserAvatar
        :user="account"
        :size-class="compact ? 'h-7 w-7 shrink-0' : 'h-8 w-8 shrink-0'"
        :enable-preview="false"
        :show-status="false"
      />
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center gap-1.5">
          <div
            class="truncate text-gray-900 dark:text-gray-50"
            :class="compact ? 'text-sm font-medium' : 'text-sm font-semibold'"
          >
            {{ account.name || account.username || 'Account' }}
          </div>
          <span
            v-if="account.accountKind === 'person'"
            class="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide text-[var(--moh-brass)] bg-[rgba(var(--moh-brass-rgb),0.14)]"
          >Primary</span>
        </div>
        <div v-if="account.username" class="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{{ account.username }}
        </div>
      </div>
      <span
        v-if="account.unreadBadgeCount > 0 && !account.isCurrent"
        class="shrink-0 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white"
        aria-hidden="true"
      ><AppAnimatedCount :value="account.unreadBadgeCount" :format="formatBadge" /></span>
      <Icon
        v-else-if="account.isCurrent"
        name="tabler:check"
        size="16"
        class="shrink-0 text-gray-900 dark:text-gray-50"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SwitchableAccount } from '~/types/api'
import { isOwnUserProfilePath } from '~/config/routes'
const formatBadge = (n: number) => (n > 99 ? '99+' : String(n))

const { accounts, canSwitch, switchingId, refresh, switchTo } = useAccountSwitcher()
const route = useRoute()
const emit = defineEmits<{ close: [] }>()

const props = withDefaults(
  defineProps<{
    active?: boolean
    /** Tighter rows for the desktop user-card popover. */
    compact?: boolean
  }>(),
  { compact: false },
)

watch(
  () => props.active,
  (active) => {
    if (active) void refresh()
  },
  { immediate: true },
)

watch(switchingId, (id) => {
  if (id) emit('close')
})

function accountLabel(account: SwitchableAccount): string {
  return account.name || account.username || 'account'
}

function accountActionLabel(account: SwitchableAccount): string {
  if (account.isCurrent) return `View ${accountLabel(account)} profile`
  return `Switch to ${accountLabel(account)}`
}

function onPick(account: SwitchableAccount) {
  emit('close')
  if (account.isCurrent) {
    openOwnProfileIfNeeded(account.username)
    return
  }
  void switchTo(account.id)
}

function openOwnProfileIfNeeded(username: string | null | undefined) {
  const handle = username?.trim()
  if (!handle) return
  if (isOwnUserProfilePath(route.path, handle)) return
  void navigateTo(`/u/${encodeURIComponent(handle)}`)
}
</script>
