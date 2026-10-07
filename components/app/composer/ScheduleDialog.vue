<template>
  <Dialog
    v-if="isPremium"
    v-model:visible="schedulePickerOpen"
    modal
    header="Schedule post"
    :style="{ width: '22rem' }"
    :draggable="false"
    @hide="schedulePickerOpen = false"
  >
    <div class="flex flex-col gap-4 py-2">
      <label class="text-sm moh-text-muted">Choose when to publish this post:</label>
      <DatePicker
        v-model="scheduledAtDraft"
        show-time
        hour-format="12"
        :min-date="scheduleMinDate"
        :max-date="scheduleMaxDate"
        date-format="M d, yy"
        show-icon
        fluid
      />
      <p v-if="scheduledAtDraft && !scheduledAtDraftIsPast" class="text-xs moh-text-muted">
        Will publish {{ formatScheduledAt(scheduledAtDraft) }}
      </p>
      <p v-else-if="scheduledAtDraft && scheduledAtDraftIsPast" class="text-xs text-amber-600 dark:text-amber-400">
        This time is in the past — post will go live immediately unless you update it.
      </p>
      <label class="flex items-center gap-2 cursor-pointer select-none text-sm moh-text-muted">
        <input v-model="scheduleMore" type="checkbox" class="accent-current rounded" >
        Schedule more after posting
      </label>
      <NuxtLink
        to="/scheduled"
        class="inline-flex items-center gap-1.5 self-start text-sm font-medium underline-offset-2 hover:underline moh-text-muted"
        @click="schedulePickerOpen = false"
      >
        <Icon name="tabler:calendar-time" class="w-4 h-4" />
        <template v-if="scheduledCount > 0">
          View scheduled posts
          <span
            class="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center tabular-nums bg-[var(--moh-premium)] text-black"
          >
            {{ scheduledCount > 99 ? '99+' : scheduledCount }}
          </span>
        </template>
        <template v-else>You have no scheduled posts</template>
      </NuxtLink>
    </div>
    <template #footer>
      <div class="flex justify-between gap-2">
        <Button
          v-if="scheduledAt"
          text
          severity="danger"
          label="Remove schedule"
          size="small"
          @click="clearSchedule"
        />
        <div class="flex gap-2 ml-auto">
          <Button text severity="secondary" label="Cancel" size="small" @click="schedulePickerOpen = false" />
          <Button label="Confirm" size="small" :disabled="!scheduledAtDraft" @click="confirmSchedule" />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
defineProps<{
  isPremium: boolean
  scheduledAt: Date | null
  scheduleMinDate: Date
  scheduleMaxDate: Date
  scheduledAtDraftIsPast: boolean
  scheduledCount: number
  formatScheduledAt: (d: Date | null) => string
  clearSchedule: () => void
  confirmSchedule: () => void
}>()

const schedulePickerOpen = defineModel<boolean>('schedulePickerOpen', { required: true })
const scheduledAtDraft = defineModel<Date | null>('scheduledAtDraft', { required: true })
const scheduleMore = defineModel<boolean>('scheduleMore', { required: true })
</script>
