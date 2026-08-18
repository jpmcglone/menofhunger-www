<template>
  <div v-if="canSwitch" class="border-b border-gray-200 dark:border-zinc-700">
    <div class="px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      Switch account
    </div>
    <button
      v-for="account in accounts"
      :key="account.id"
      type="button"
      class="moh-tap flex w-full items-center gap-3 px-5 py-2.5 moh-surface-hover moh-focus text-left"
      :disabled="account.isCurrent || switchingId === account.id"
      :aria-current="account.isCurrent ? 'true' : undefined"
      @click="onSwitch(account.id)"
    >
      <AppUserAvatar
        :user="account"
        size-class="h-8 w-8 shrink-0"
        :enable-preview="false"
        :show-status="false"
      />
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold truncate text-gray-900 dark:text-gray-50">
          {{ account.name || account.username || 'Account' }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
          <span v-if="account.username">@{{ account.username }}</span>
          <span v-if="account.accountKind === 'page'"> · Page</span>
        </div>
      </div>
      <span
        v-if="account.unreadBadgeCount > 0 && !account.isCurrent"
        class="shrink-0 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white"
        aria-hidden="true"
      >{{ account.unreadBadgeCount > 99 ? '99+' : account.unreadBadgeCount }}</span>
      <Icon
        v-else-if="account.isCurrent"
        name="tabler:check"
        size="16"
        class="shrink-0 text-gray-900 dark:text-gray-50"
        aria-hidden="true"
      />
      <Icon
        v-else-if="switchingId === account.id"
        name="tabler:loader-2"
        size="16"
        class="shrink-0 animate-spin text-gray-400"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
const { accounts, canSwitch, switchingId, refresh, switchTo } = useAccountSwitcher()

const props = defineProps<{
  active?: boolean
}>()

watch(
  () => props.active,
  (active) => {
    if (active) void refresh()
  },
  { immediate: true },
)

function onSwitch(userId: string) {
  void switchTo(userId)
}
</script>
