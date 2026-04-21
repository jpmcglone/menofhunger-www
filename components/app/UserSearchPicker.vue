<template>
  <div class="space-y-2">
    <InputText
      v-model="search.query.value"
      class="w-full"
      :placeholder="placeholder ?? 'Search by username or name…'"
      :aria-label="placeholder ?? 'User search'"
      :autofocus="autofocus"
      :disabled="disabled"
      @keydown.enter.prevent="onSubmitFirst"
    />

    <div v-if="search.loading.value" class="text-xs moh-text-muted">Searching…</div>
    <AppInlineAlert v-if="search.error.value" severity="danger">{{ search.error.value }}</AppInlineAlert>

    <div
      v-if="sortedResults.length > 0"
      class="max-h-56 overflow-y-auto rounded-lg border moh-border divide-y divide-gray-100 dark:divide-white/5"
    >
      <button
        v-for="u in sortedResults"
        :key="u.id"
        type="button"
        class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
        :class="rowClass(u)"
        :disabled="disabled || !isSelectable(u)"
        :title="!isSelectable(u) ? hintFor(u) : undefined"
        @click="pick(u)"
      >
        <AppUserAvatar :user="u" size-class="h-8 w-8" />
        <div class="min-w-0 flex-1">
          <AppUserIdentityLine :user="u" class="min-w-0" />
          <p
            v-if="!isSelectable(u)"
            class="text-[11px] moh-text-muted mt-0.5"
          >
            {{ hintFor(u) }}
          </p>
        </div>
      </button>
    </div>

    <div
      v-else-if="!search.loading.value && search.query.value.trim().length > 0 && !search.error.value"
      class="text-xs moh-text-muted px-1"
    >
      No matching {{ emptyNoun }} found.
    </div>


    <div v-if="multiple && selectedUsers.length > 0" class="flex flex-wrap gap-2 pt-1">
      <span
        v-for="u in selectedUsers"
        :key="u.id"
        class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
        :style="search.tagStyle(u)"
      >
        <AppUserAvatar :user="u" size-class="h-5 w-5" />
        <span class="font-medium">@{{ u.username }}</span>
        <button
          type="button"
          class="opacity-60 hover:opacity-100 transition-opacity leading-none"
          :aria-label="`Remove ${u.username}`"
          @click="removePick(u.id)"
        >
          <Icon name="tabler:x" class="h-3 w-3" aria-hidden="true" />
        </button>
      </span>
    </div>

    <div v-else-if="!multiple && selectedUsers.length > 0" class="flex items-center gap-2 pt-1">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
        :style="search.tagStyle(selectedUsers[0]!)"
      >
        <AppUserAvatar :user="selectedUsers[0]!" size-class="h-5 w-5" />
        <span class="font-medium">@{{ selectedUsers[0]!.username }}</span>
        <button
          type="button"
          class="opacity-60 hover:opacity-100 transition-opacity leading-none"
          :aria-label="`Clear ${selectedUsers[0]!.username}`"
          @click="clearSelection"
        >
          <Icon name="tabler:x" class="h-3 w-3" aria-hidden="true" />
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import {
  useRecipientSearch,
  type RecipientShowFilter,
} from '~/composables/chat/useRecipientSearch'

/**
 * Reusable user search + picker. Delegates query/debounce/result-filter logic
 * to `useRecipientSearch` so behavior stays in lockstep wherever the picker is used.
 *
 * Two independent knobs:
 *   - `show`             — which users appear in the dropdown (all / verified / premium / org)
 *   - `requireVerified`  — when true, non-verified users are still rendered but
 *                          can't be picked (button is disabled, with a hint).
 *
 * Single-select by default; pass `multiple` for the chat-style multi-recipient flow.
 */
type ModelValue = FollowListUser | FollowListUser[] | null

const props = withDefaults(
  defineProps<{
    modelValue?: ModelValue
    multiple?: boolean
    placeholder?: string
    autofocus?: boolean
    disabled?: boolean
    excludeUserIds?: string[]
    /** Tier filter for what shows in the dropdown. */
    show?: RecipientShowFilter
    /** When true, non-verified users are visible but not selectable. */
    requireVerified?: boolean
    /** When true, users already in a Crew are shown as disabled and sorted to the bottom. */
    disableInCrew?: boolean
    /** Optional override for the disabled-row hint copy. */
    unselectableHint?: string
    /** Page size for the /search request. */
    limit?: number
  }>(),
  {
    modelValue: null,
    multiple: false,
    placeholder: undefined,
    autofocus: false,
    disabled: false,
    excludeUserIds: () => [],
    show: 'all',
    requireVerified: false,
    disableInCrew: false,
    unselectableHint: undefined,
    limit: 8,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
  (e: 'pick', user: FollowListUser): void
}>()

const { user: viewer } = useAuth()

const selectedUsers = computed<FollowListUser[]>(() => {
  const v = props.modelValue
  if (!v) return []
  return Array.isArray(v) ? v : [v]
})

// Hide already-selected users from the result list as well as caller-supplied excludes.
const allExcludeIds = computed<string[]>(() => {
  const ids = new Set<string>(props.excludeUserIds)
  for (const u of selectedUsers.value) ids.add(u.id)
  return [...ids]
})

const search = useRecipientSearch(computed(() => viewer.value?.id ?? null), {
  show: props.show,
  excludeUserIds: allExcludeIds,
  limit: props.limit,
})

const selectableHint = computed(
  () => props.unselectableHint ?? 'Verified members only.',
)

const emptyNoun = computed(() => {
  if (props.show === 'verified') return 'verified men'
  if (props.show === 'premium') return 'premium members'
  if (props.show === 'organization') return 'organizations'
  return 'people'
})

// Sort selectable users before disabled users (inCrew or unverified)
const sortedResults = computed<FollowListUser[]>(() => {
  const results = search.results.value
  if (!props.disableInCrew && !props.requireVerified) return results
  return [...results].sort((a, b) => {
    const aOk = isSelectable(a) ? 0 : 1
    const bOk = isSelectable(b) ? 0 : 1
    return aOk - bOk
  })
})

function isSelectable(u: FollowListUser): boolean {
  if (props.requireVerified) {
    const status = (u as unknown as { verifiedStatus?: string | null }).verifiedStatus ?? 'none'
    if (status === 'none') return false
  }
  if (props.disableInCrew && (u as FollowListUser & { inCrew?: boolean }).inCrew) return false
  return true
}

function hintFor(u: FollowListUser): string {
  if (props.disableInCrew && (u as FollowListUser & { inCrew?: boolean }).inCrew) {
    return 'Already in a Crew.'
  }
  return selectableHint.value
}

function rowClass(u: FollowListUser): string {
  if (!isSelectable(u) || props.disabled) {
    return 'opacity-50 cursor-not-allowed'
  }
  return 'hover:bg-gray-50 dark:hover:bg-zinc-900'
}

function pick(u: FollowListUser) {
  if (!isSelectable(u)) return
  if (selectedUsers.value.some((s) => s.id === u.id)) return
  if (props.multiple) {
    emit('update:modelValue', [...selectedUsers.value, u])
  } else {
    emit('update:modelValue', u)
  }
  emit('pick', u)
  search.query.value = ''
  search.results.value = []
}

function removePick(userId: string) {
  if (props.multiple) {
    emit('update:modelValue', selectedUsers.value.filter((u) => u.id !== userId))
  } else {
    emit('update:modelValue', null)
  }
}

function clearSelection() {
  emit('update:modelValue', props.multiple ? [] : null)
}

function onSubmitFirst() {
  const first = sortedResults.value.find((u) => isSelectable(u))
  if (first) pick(first)
}

defineExpose({ clearSelection })
</script>
