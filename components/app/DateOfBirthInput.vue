<template>
  <div
    class="flex items-center gap-1 rounded-xl border px-3 py-2 transition-colors"
    :class="[
      invalid
        ? 'border-red-500 dark:border-red-400'
        : focused
          ? 'border-[var(--p-primary-color)]'
          : 'moh-border',
      disabled ? 'opacity-60 cursor-not-allowed bg-transparent' : 'moh-bg',
    ]"
    @click="focusFirstEmpty"
  >
    <!-- Month -->
    <input
      ref="mmEl"
      v-model="mm"
      inputmode="numeric"
      maxlength="2"
      placeholder="MM"
      aria-label="Month"
      class="w-8 bg-transparent text-center text-sm font-mono moh-text placeholder:moh-text-muted outline-none"
      :disabled="disabled"
      @input="onMmInput"
      @keydown="onMmKeydown"
      @focus="focused = true"
      @blur="onBlur"
    />
    <span class="moh-text-muted select-none text-sm">/</span>
    <!-- Day -->
    <input
      ref="ddEl"
      v-model="dd"
      inputmode="numeric"
      maxlength="2"
      placeholder="DD"
      aria-label="Day"
      class="w-8 bg-transparent text-center text-sm font-mono moh-text placeholder:moh-text-muted outline-none"
      :disabled="disabled"
      @input="onDdInput"
      @keydown="onDdKeydown"
      @focus="focused = true"
      @blur="onBlur"
    />
    <span class="moh-text-muted select-none text-sm">/</span>
    <!-- Year -->
    <input
      ref="yyyyEl"
      v-model="yyyy"
      inputmode="numeric"
      maxlength="4"
      placeholder="YYYY"
      aria-label="Year"
      class="w-12 bg-transparent text-center text-sm font-mono moh-text placeholder:moh-text-muted outline-none"
      :disabled="disabled"
      @input="onYyyyInput"
      @keydown="onYyyyKeydown"
      @focus="focused = true"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { assembleBirthdate, splitBirthdate } from '~/utils/birthdate'

const props = withDefaults(defineProps<{
  modelValue: string
  disabled?: boolean
  invalid?: boolean
}>(), {
  disabled: false,
  invalid: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const mmEl = ref<HTMLInputElement | null>(null)
const ddEl = ref<HTMLInputElement | null>(null)
const yyyyEl = ref<HTMLInputElement | null>(null)
const focused = ref(false)

const { mm, dd, yyyy } = (() => {
  const parts = splitBirthdate(props.modelValue)
  return {
    mm: ref(parts.mm),
    dd: ref(parts.dd),
    yyyy: ref(parts.yyyy),
  }
})()

watch(
  () => props.modelValue,
  (val) => {
    const parts = splitBirthdate(val)
    // Only overwrite if the assembled value differs from current (avoid clobbering in-progress typing)
    if (assembleBirthdate(mm.value, dd.value, yyyy.value) !== val) {
      mm.value = parts.mm
      dd.value = parts.dd
      yyyy.value = parts.yyyy
    }
  },
)

function emitCurrent() {
  emit('update:modelValue', assembleBirthdate(mm.value, dd.value, yyyy.value))
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

function onMmInput() {
  mm.value = onlyDigits(mm.value).slice(0, 2)
  emitCurrent()
  if (mm.value.length === 2) ddEl.value?.focus()
}

function onDdInput() {
  dd.value = onlyDigits(dd.value).slice(0, 2)
  emitCurrent()
  if (dd.value.length === 2) yyyyEl.value?.focus()
}

function onYyyyInput() {
  yyyy.value = onlyDigits(yyyy.value).slice(0, 4)
  emitCurrent()
}

function onMmKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && mm.value === '') {
    // nothing to go back to from first field
  } else if (e.key === 'ArrowRight' && (e.currentTarget as HTMLInputElement).selectionStart === mm.value.length) {
    ddEl.value?.focus()
  }
}

function onDdKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && dd.value === '') {
    mmEl.value?.focus()
  } else if (e.key === 'ArrowLeft' && (e.currentTarget as HTMLInputElement).selectionStart === 0) {
    mmEl.value?.focus()
  } else if (e.key === 'ArrowRight' && (e.currentTarget as HTMLInputElement).selectionStart === dd.value.length) {
    yyyyEl.value?.focus()
  }
}

function onYyyyKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && yyyy.value === '') {
    ddEl.value?.focus()
  } else if (e.key === 'ArrowLeft' && (e.currentTarget as HTMLInputElement).selectionStart === 0) {
    ddEl.value?.focus()
  }
}

function onBlur() {
  // Delay so focus transfers within the widget don't flash the unfocused state
  setTimeout(() => {
    if (
      document.activeElement !== mmEl.value &&
      document.activeElement !== ddEl.value &&
      document.activeElement !== yyyyEl.value
    ) {
      focused.value = false
    }
  }, 80)
}

function focusFirstEmpty() {
  if (props.disabled) return
  if (!mm.value) { mmEl.value?.focus(); return }
  if (!dd.value) { ddEl.value?.focus(); return }
  yyyyEl.value?.focus()
}
</script>
