<template>
  <div class="mt-3">
    <div class="flex flex-col gap-3">
      <div
        v-for="(opt, idx) in options"
        :key="opt.id"
        class="flex items-stretch gap-3"
      >
          <!-- Option image (left) - reuse existing media slot tile UI -->
          <div class="shrink-0 self-start">
            <AppComposerMediaSlotTile
              :media-slot="slotForOption(opt)"
              :first-empty-slot-index="0"
              :can-add-more="true"
              :dragging-media-id="null"
              upload-bar-color="var(--p-primary-color)"
              :upload-status-label="pollUploadStatusLabel"
              :draggable="false"
              :show-alt="false"
              tile-size-class="h-[4.5rem] w-[4.5rem]"
              @add="onClickPickImage(opt.id)"
              @remove="() => removeOptionImage(opt.id)"
            />
          </div>

          <!-- Option input (right) -->
          <div class="min-w-0 flex-1">
            <div
              class="relative px-3 py-2 pr-14 min-h-[4.5rem] rounded-xl border moh-border-subtle transition-colors"
              :class="isOptionFocused(opt.id) ? 'border-[color:var(--p-primary-color)] ring-2 ring-[color:var(--p-primary-color)]' : ''"
            >
              <div v-if="shouldShowChoiceHeader(opt.id, opt.text)" class="text-[12px] font-semibold moh-text-muted">
                  Choice {{ idx + 1 }}<span v-if="idx >= 2" class="moh-text-muted font-semibold"> (Optional)</span>
              </div>

              <!-- Overlay: count (and trash) should not affect layout height -->
              <div
                v-if="shouldShowChoiceHeader(opt.id, opt.text)"
                class="absolute top-2 right-3 flex flex-col items-end gap-1"
              >
                <div class="text-[12px] font-semibold moh-text-muted tabular-nums">
                  {{ (opt.text ?? '').length }}/30
                </div>
                <button
                  v-if="idx >= 2"
                  type="button"
                  class="h-8 w-8 rounded-full transition-colors moh-surface-hover flex items-center justify-center moh-focus"
                  :aria-label="`Remove option ${idx + 1}`"
                  :disabled="opt.uploadStatus === 'uploading' || opt.uploadStatus === 'processing'"
                  @click.stop="onRemoveOptionClick(opt.id)"
                >
                  <Icon name="tabler:trash" class="text-[18px] text-red-600 dark:text-red-400" aria-hidden="true" />
                </button>
              </div>

              <InputText
                class="w-full !bg-transparent !border-0 !shadow-none !px-0 !py-1 moh-text placeholder:text-[color:var(--moh-text-muted)] placeholder:opacity-80"
                :model-value="opt.text"
                :maxlength="30"
                :placeholder="shouldShowChoiceHeader(opt.id, opt.text) ? '' : (idx >= 2 ? `Choice ${idx + 1} (Optional)` : `Choice ${idx + 1}`)"
                :aria-label="`Poll option ${idx + 1}`"
                @focus="onOptionFocus(opt.id)"
                @blur="onOptionBlur(opt.id)"
                @update:model-value="(v) => updateOptionText(opt.id, String(v ?? ''))"
              />

              <div v-if="opt.uploadStatus === 'error'" class="mt-1 text-[11px] text-red-600 dark:text-red-400">
                {{ opt.uploadError || 'Upload failed.' }}
              </div>
            </div>
          </div>
      </div>
    </div>

    <div v-if="options.length < 5" class="mt-3 flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border moh-border px-4 py-2 text-sm font-semibold moh-text-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors moh-focus"
        aria-label="Add option"
        @click="addOption"
      >
        <Icon name="tabler:plus" class="text-[18px]" aria-hidden="true" />
        Add option
      </button>
    </div>

    <!-- Poll length -->
    <div class="mt-4">
      <div class="text-sm font-semibold moh-text mb-2">Poll length</div>
      <div class="grid grid-cols-3 gap-3">
        <div class="min-w-0">
          <div class="text-[11px] moh-text-muted font-semibold mb-1">Days</div>
          <Dropdown
            v-model="duration.days"
            :options="dayOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            aria-label="Poll days"
          />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] moh-text-muted font-semibold mb-1">Hours</div>
          <Dropdown
            v-model="duration.hours"
            :options="hourOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="duration.days === 7"
            aria-label="Poll hours"
          />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] moh-text-muted font-semibold mb-1">Minutes</div>
          <Dropdown
            v-model="duration.minutes"
            :options="minuteOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="duration.days === 7"
            aria-label="Poll minutes"
          />
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-center">
      <button
        type="button"
        class="text-red-600 dark:text-red-400 font-semibold text-sm hover:underline moh-focus"
        @click="emit('remove')"
      >
        Remove poll
      </button>
    </div>

    <input
      ref="fileInputEl"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/avif"
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileSelected"
    >
  </div>
</template>

<script setup lang="ts">
import type { ComposerPollPayload } from '~/composables/composer/types'
import { usePollEditor } from '~/composables/composer/usePollEditor'

const props = defineProps<{
  modelValue: ComposerPollPayload
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: ComposerPollPayload): void
  (e: 'remove'): void
  (e: 'status', v: { uploading: boolean; hasFailed: boolean }): void
}>()

const {
  fileInputEl,
  options,
  duration,
  slotForOption,
  pollUploadStatusLabel,
  dayOptions,
  hourOptions,
  minuteOptions,
  onOptionFocus,
  onOptionBlur,
  isOptionFocused,
  shouldShowChoiceHeader,
  addOption,
  onRemoveOptionClick,
  updateOptionText,
  onClickPickImage,
  removeOptionImage,
  onFileSelected,
} = usePollEditor(props, emit)
</script>
