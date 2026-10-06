<template>
  <div v-if="canSwitch && currentAccount" :class="compact ? 'pb-1' : 'border-b moh-border'">
    <button
      ref="triggerRef"
      type="button"
      class="moh-tap moh-surface-hover moh-focus flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left"
      :disabled="Boolean(switchingId)"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      :aria-controls="menuId"
      aria-label="Switch account"
      @click="menuRef?.toggle($event)"
    >
      <AppUserAvatar :user="currentAccount" size-class="h-8 w-8 shrink-0" :enable-preview="false" :show-status="false" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold">{{ currentAccount.name || currentAccount.username || 'Account' }}</span>
        <span v-if="currentAccount.username" class="moh-text-muted block truncate text-xs">@{{ currentAccount.username }}</span>
      </span>
      <AppActivityBadge v-if="!menuOpen" :count="totalCount" :has-unread="hasAnyDot" unread-label="Unread activity" />
      <Icon :name="switchingId ? 'tabler:loader-2' : 'tabler:chevron-down'" size="16" :class="switchingId ? 'animate-spin' : ''" aria-hidden="true" />
    </button>
    <Menu :id="menuId" ref="menuRef" :model="menuItems" popup append-to="body" :base-z-index="OVERLAY_LAYERS.nestedMenu" class="max-h-[60vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto" @show="menuOpen = true" @hide="menuOpen = false">
      <template #item="{ item, props: menuProps }">
        <a v-bind="menuProps.action" class="moh-tap flex min-h-11 items-center gap-2.5 px-3 py-2" :aria-label="accountActionLabel(item.account)">
      <AppUserAvatar
        :user="item.account"
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
            {{ item.account.name || item.account.username || 'Account' }}
          </div>
          <span
            v-if="item.account.accountKind === 'person'"
            class="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide text-[var(--moh-brass)] bg-[rgba(var(--moh-brass-rgb),0.14)]"
          >Primary</span>
        </div>
        <div v-if="item.account.username" class="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{{ item.account.username }}
        </div>
      </div>
      <AppActivityBadge :count="item.account.isCurrent ? activeBadgeCount : item.account.unreadBadgeCount" :has-unread="item.account.isCurrent ? currentHasDot : (item.account.hasUnreadNotifications || item.account.hasUnreadBoard)" />
      <Icon
        v-if="item.account.isCurrent"
        name="tabler:check"
        size="16"
        class="shrink-0 text-gray-900 dark:text-gray-50"
        aria-hidden="true"
      />

        </a>
      </template>
    </Menu>
  </div>
</template>
<script setup lang="ts">
import type { SwitchableAccount } from '~/types/api'
import Menu from 'primevue/menu'
import { OVERLAY_LAYERS } from '~/utils/overlay-layers'

const { accounts, canSwitch, switchingId, refresh, switchTo } = useAccountSwitcher()
const { currentCount: activeBadgeCount, currentHasDot, totalCount, hasAnyDot } = useAttentionTotals()
const menuRef = ref<InstanceType<typeof Menu>>()
const menuOpen = ref(false)
const triggerRef = ref<HTMLButtonElement>()
useOverlayDismiss(menuOpen, () => {
  menuRef.value?.hide()
  triggerRef.value?.focus()
})
const menuId = useId()
const currentAccount = computed(() => accounts.value.find((account) => account.isCurrent))
const menuItems = computed(() => accounts.value.map((account) => ({
  label: accountActionLabel(account), account, disabled: Boolean(switchingId.value),
  command: () => onPick(account),
})))
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
  const label = account.isCurrent ? `${accountLabel(account)}, current account` : `Switch to ${accountLabel(account)}`
  const count = account.isCurrent ? activeBadgeCount.value : account.unreadBadgeCount
  const unread = account.isCurrent ? currentHasDot.value : (account.hasUnreadNotifications || account.hasUnreadBoard)
  return count > 0 ? `${label}, ${count} pending updates` : unread ? `${label}, unread notifications` : label
}

function onPick(account: SwitchableAccount) {
  menuRef.value?.hide()
  if (account.isCurrent || switchingId.value) return
  void switchTo(account.id)
}
</script>
