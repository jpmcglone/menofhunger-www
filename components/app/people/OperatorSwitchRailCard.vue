<template>
  <div class="moh-card moh-card-matte rounded-2xl px-4 py-3">
    <div v-if="operatorUser" class="space-y-4">
      <div class="flex items-center gap-3">
        <AppUserAvatar
          :user="operatorUser"
          size-class="h-10 w-10 shrink-0"
          :enable-preview="false"
          :show-status="false"
        />
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-1.5">
            <div class="truncate text-sm font-semibold moh-text">
              {{ operatorUser.name || operatorUser.username || operatorLabel }}
            </div>
            <span
              class="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide text-[var(--moh-brass)] bg-[rgba(var(--moh-brass-rgb),0.14)]"
            >Primary</span>
          </div>
          <div
            v-if="operatorUser.username"
            class="truncate text-xs moh-text-muted"
          >
            @{{ operatorUser.username }}
          </div>
        </div>
      </div>
      <Button
        label="Switch back"
        size="small"
        rounded
        :aria-label="`Switch back to ${operatorLabel}`"
        :disabled="busy"
        :loading="busy"
        :class="switchButtonClass"
        @click="onSwitch"
      />
    </div>
    <div v-else class="space-y-4 animate-pulse" aria-hidden="true">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" />
        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="h-3 w-28 rounded-full bg-gray-200 dark:bg-zinc-800" />
          <div class="h-2.5 w-16 rounded-full bg-gray-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div class="h-8 w-full rounded-full bg-gray-200 dark:bg-zinc-800" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSafeUserErrorMessage } from '~/utils/api-error'

const {
  operatorUser,
  operatorLabel,
  switchingId,
  refreshAccounts,
  switchToOperator,
} = usePersonAccountGate()
const toast = useAppToast()
const { confirm } = useAppConfirm()

const busy = computed(() => Boolean(switchingId.value))

const switchButtonClass =
  'w-full !rounded-full !px-3 !py-2 !min-h-0 !text-xs !leading-none !font-semibold ' +
  '!bg-gray-900 !border-gray-900 !text-white ' +
  'dark:!bg-white dark:!border-white dark:!text-black ' +
  'active:scale-[0.96] transition-transform duration-100'

onMounted(() => {
  void refreshAccounts()
})

async function onSwitch() {
  if (!operatorUser.value?.id || busy.value) return
  const ok = await confirm({
    header: 'Switch back?',
    message: `This will switch you to ${operatorLabel.value}.`,
    confirmLabel: 'Switch back',
    confirmSeverity: 'primary',
  })
  if (ok !== true) return
  try {
    await switchToOperator()
  } catch (e) {
    toast.push({
      title: getSafeUserErrorMessage(e, 'Could not switch accounts.'),
      tone: 'error',
    })
  }
}
</script>
