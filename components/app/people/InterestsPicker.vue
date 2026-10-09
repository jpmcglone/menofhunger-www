<template>
  <div class="space-y-2">
    <div class="flex items-baseline justify-between gap-3">
      <label v-if="label" class="text-sm font-medium moh-text">
        {{ label }}
        <span v-if="required" class="ml-0.5">*</span>
      </label>
      <div v-if="helperRight" class="text-xs moh-text-muted">
        {{ helperRight }}
      </div>
    </div>

    <button
      type="button"
      class="w-full rounded-xl border p-3 text-left transition-colors moh-surface-hover disabled:opacity-60"
      :class="invalid ? 'border-red-500 dark:border-red-400' : 'moh-border'"
      :disabled="disabled"
      @click="openDialog"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold moh-text">
            {{ selected.length > 0 ? `${selected.length} selected` : emptyLabel }}
          </div>
          <div v-if="description" class="mt-1 text-xs moh-text-muted">
            {{ description }}
          </div>
        </div>
        <Icon name="tabler:chevron-right" class="moh-text-muted" aria-hidden="true" />
      </div>

      <div v-if="selected.length > 0 && showSelectedChips" class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="v in selected"
          :key="v"
          class="inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-none"
          :style="{ borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)', backgroundColor: 'transparent' }"
        >
          {{ labelFor(v) }}
        </span>
      </div>
    </button>

    <div v-if="helperBottom" class="text-xs moh-text-muted">
      {{ helperBottom }}
    </div>

    <AppModal
      v-model="dialogOpen"
      title="Choose your arenas"
      max-width-class="max-w-[46rem]"
      :dismissable-mask="true"
      :disable-close="disabled"
      body-class="p-0 overflow-hidden"
      max-height="min(90vh, 52rem)"
    >
      <div class="p-4 h-full flex flex-col gap-3">
        <div class="text-sm moh-text-muted">
          Pick the arenas you're building in. Fine-tune with the search below.
        </div>

        <!-- Arena quick-picks -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="arena in LIFE_ARENAS"
            :key="arena.key"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
            :class="arenaState(arena) !== 'none' ? 'bg-transparent' : 'moh-surface-hover'"
            :style="
              arenaState(arena) !== 'none'
                ? { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)' }
                : { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
            "
            :disabled="disabled"
            :title="arena.description"
            @click="onToggleArena(arena)"
          >
            <Icon :name="arena.icon" class="text-xs shrink-0" aria-hidden="true" />
            <span>{{ arena.label }}</span>
          </button>
        </div>

        <div class="space-y-2">
          <InputText
            ref="queryEl"
            v-model="query"
            class="w-full"
            placeholder="Search interests…"
          />

          <div class="flex items-center justify-between gap-3">
            <div
              class="text-xs font-semibold"
              :class="atMax ? 'text-amber-600 dark:text-amber-400' : 'moh-text-muted'"
            >
              <template v-if="atMax">
                {{ max }} / {{ max }} &mdash; remove one to add another
              </template>
              <template v-else>
                {{ draft.length }} / {{ max }} selected
                <span v-if="required && draft.length < min"> &middot; pick at least {{ min }}</span>
              </template>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="draft.length > 0"
                label="Clear"
                text
                severity="secondary"
                :disabled="disabled"
                @click="draft = []"
              />
            </div>
          </div>
        </div>

        <!-- Scrollable tags area (Suggested + More) -->
        <div class="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-1 space-y-4">
          <div v-if="filteredSuggestedGroups.length > 0" class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="flex-1 border-t moh-border" />
              <span class="text-xs font-bold uppercase tracking-widest moh-text">Suggested</span>
              <div class="flex-1 border-t moh-border" />
            </div>
            <div class="space-y-4">
              <div v-for="g in filteredSuggestedGroups" :key="`sg-${g.group}`" class="space-y-2">
                <div class="text-xs font-semibold uppercase tracking-wide moh-text-muted text-center">
                  {{ g.group }}
                </div>
                <div class="flex flex-wrap justify-center gap-2">
                  <button
                    v-for="opt in g.options"
                    :key="`s-${g.group}-${opt.value}`"
                    type="button"
                    class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
                    :class="chipClass(opt.value)"
                    :style="
                      draft.includes(opt.value)
                        ? { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)' }
                        : { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
                    "
                    :disabled="disabled"
                    @click="toggle(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="flex-1 border-t moh-border" />
              <span class="text-xs font-bold uppercase tracking-widest moh-text">More interests</span>
              <div class="flex-1 border-t moh-border" />
            </div>
            <div class="space-y-6">
              <div
                v-for="g in groupedAllOptions"
                :key="g.group"
                class="space-y-2"
              >
                <div class="text-xs font-semibold uppercase tracking-wide moh-text-muted text-center">
                  {{ g.group }}
                </div>
                <TransitionGroup name="moh-interest" tag="div" class="flex flex-wrap justify-center gap-2">
                  <button
                    v-for="opt in g.options"
                    :key="opt.value"
                    type="button"
                    class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
                    :class="chipClass(opt.value)"
                    :style="
                      draft.includes(opt.value)
                        ? { borderColor: 'var(--p-primary-color)', color: 'var(--p-primary-color)' }
                        : { borderColor: 'var(--moh-border)', color: 'var(--moh-text)' }
                    "
                    :disabled="disabled"
                    @click="toggle(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                  </button>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs moh-text-muted text-center sm:text-left">
            Tip: press Enter to add what you typed.
          </div>
          <div class="flex items-center justify-end gap-2">
            <Button label="Cancel" severity="secondary" text :disabled="disabled" @click="closeDialog" />
            <Button
              label="Done"
              :disabled="(required && draft.length < min) || disabled"
              @click="commit"
            >
              <template #icon>
                <Icon name="tabler:check" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { LIFE_ARENAS, arenaSelectionState, toggleArena } from '~/config/arenas'
import { useInterestPickerOptions } from '~/composables/interests/useInterestPickerOptions'

const props = withDefaults(defineProps<{
  modelValue: string[]
  disabled?: boolean
  required?: boolean
  min?: number
  max?: number
  label?: string
  emptyLabel?: string
  description?: string
  helperRight?: string
  helperBottom?: string
  showSelectedChips?: boolean
  invalid?: boolean
}>(), {
  disabled: false,
  required: true,
  min: 1,
  max: 30,
  label: 'Interests',
  emptyLabel: 'Select interests',
  description: 'Search and pick tags that describe what you’re into.',
  helperRight: 'Pick at least 1',
  helperBottom: 'We’ll use these to personalize your experience.',
  showSelectedChips: true,
  invalid: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
}>()

const selected = computed(() => Array.isArray(props.modelValue) ? props.modelValue : [])

const dialogOpen = ref(false)
const draft = ref<string[]>([])
const query = ref('')
const queryEl = ref<HTMLInputElement | null>(null)

const { labelFor, fetchSuggestedByGroup, groupedAllOptions, filteredSuggestedGroups } = useInterestPickerOptions(selected, query)
const { push: pushToast, toasts, dismiss } = useAppToast()

const atMax = computed(() => draft.value.length >= props.max)

// Stable ID so rapid taps replace rather than stack the same toast.
const capToastId = ref<string | null>(null)

function showCapToast() {
  // Dismiss any existing cap toast before pushing a fresh one.
  if (capToastId.value) {
    dismiss(capToastId.value)
    capToastId.value = null
  }
  // Guard: don't push if the same message is already visible.
  const alreadyVisible = toasts.value.some((t) => t.id === capToastId.value)
  if (alreadyVisible) return
  capToastId.value = pushToast({
    title: `Limit reached (${props.max})`,
    message: 'Remove an interest to add another.',
    tone: 'error',
    stacked: true,
  })
}

function chipClass(value: string): string {
  if (draft.value.includes(value)) return 'bg-transparent'
  if (atMax.value) return 'opacity-40 cursor-not-allowed'
  return 'moh-surface-hover'
}

function arenaState(arena: (typeof LIFE_ARENAS)[number]) {
  return arenaSelectionState(arena, draft.value)
}

function onToggleArena(arena: (typeof LIFE_ARENAS)[number]) {
  if (props.disabled) return
  const wasActive = arenaState(arena) !== 'none'
  draft.value = toggleArena(arena, draft.value, props.max)
  useNuxtApp().$posthog?.capture('arena_toggled', {
    arena: arena.key,
    action: wasActive ? 'deselect' : 'select',
  })
  // If we were adding and the arena isn't fully selected, some interests were blocked by the cap
  if (!wasActive && atMax.value && arenaState(arena) !== 'full') {
    showCapToast()
  }
}

function toggle(value: string) {
  const v = String(value ?? '').trim()
  if (!v) return
  const next = new Set(draft.value)
  if (next.has(v)) {
    next.delete(v)
  } else {
    if (draft.value.length >= props.max) {
      showCapToast()
      return
    }
    next.add(v)
  }
  draft.value = Array.from(next)
}

// Custom interests disabled: curated list only.

function openDialog() {
  if (props.disabled) return
  dialogOpen.value = true
}

function onDialogShow() {
  query.value = ''
  draft.value = [...selected.value]
  void fetchSuggestedByGroup()
  // focus after next tick so modal renders input
  void nextTick(() => queryEl.value?.focus?.())
}

function closeDialog() {
  dialogOpen.value = false
}

function commit() {
  const cleaned = Array.from(
    new Set(
      (draft.value ?? [])
        .map((s) => String(s ?? '').trim())
        .filter(Boolean),
    ),
  ).slice(0, props.max)
  emit('update:modelValue', cleaned)
  closeDialog()
}

watch(
  dialogOpen,
  (open) => {
    if (open) onDialogShow()
  },
  { flush: 'post' },
)
</script>

<style scoped>
.moh-interest-enter-active,
.moh-interest-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.moh-interest-move {
  transition: transform 160ms ease;
}
.moh-interest-enter-from,
.moh-interest-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

