<template>
  <div class="space-y-2">
    <div v-if="filters.length" class="moh-divide">
      <div
        v-for="(filter, index) in filters"
        :key="filter.type"
        class="flex flex-wrap items-center gap-2 py-2"
      >
        <template v-if="filter.type === 'inactive'">
          <span class="text-sm moh-text">Haven't opened the app in</span>
          <InputNumber
            :model-value="filter.amount"
            :min="1"
            :max="3650"
            :disabled="locked"
            size="small"
            :input-style="{ width: '4.5rem' }"
            input-class="tabular-nums"
            @update:model-value="patchAmount(index, $event)"
          />
          <Select
            :model-value="filter.unit"
            :options="NEWSLETTER_DURATION_UNITS"
            option-label="label"
            option-value="value"
            :disabled="locked"
            class="w-[7.5rem]"
            @update:model-value="patchUnit(index, $event)"
          />
        </template>

        <template v-else-if="filter.type === 'joined'">
          <Select
            :model-value="filter.cmp"
            :options="joinedCmpOptions"
            option-label="label"
            option-value="value"
            :disabled="locked"
            class="w-[13rem]"
            @update:model-value="patchJoinedCmp(index, $event)"
          />
          <InputNumber
            :model-value="filter.amount"
            :min="1"
            :max="3650"
            :disabled="locked"
            size="small"
            :input-style="{ width: '4.5rem' }"
            input-class="tabular-nums"
            @update:model-value="patchAmount(index, $event)"
          />
          <Select
            :model-value="filter.unit"
            :options="NEWSLETTER_DURATION_UNITS"
            option-label="label"
            option-value="value"
            :disabled="locked"
            class="w-[7.5rem]"
            @update:model-value="patchUnit(index, $event)"
          />
        </template>

        <template v-else-if="filter.type === 'tier'">
          <Select
            :model-value="filter.min"
            :options="tierOptions"
            option-label="label"
            option-value="value"
            :disabled="locked"
            class="w-[14rem]"
            @update:model-value="patchTier(index, $event)"
          />
        </template>

        <template v-else>
          <span class="text-sm moh-text">No check-in in</span>
          <InputNumber
            :model-value="filter.amount"
            :min="1"
            :max="3650"
            :disabled="locked"
            size="small"
            :input-style="{ width: '4.5rem' }"
            input-class="tabular-nums"
            @update:model-value="patchAmount(index, $event)"
          />
          <Select
            :model-value="filter.unit"
            :options="NEWSLETTER_DURATION_UNITS"
            option-label="label"
            option-value="value"
            :disabled="locked"
            class="w-[7.5rem]"
            @update:model-value="patchUnit(index, $event)"
          />
        </template>

        <Button
          v-if="!locked"
          text
          severity="secondary"
          size="small"
          class="ml-auto"
          aria-label="Remove filter"
          @click="remove(index)"
        >
          <template #icon><Icon name="tabler:x" aria-hidden="true" /></template>
        </Button>
      </div>
    </div>

    <Select
      v-if="!locked && addOptions.length"
      v-model="addKind"
      :options="addOptions"
      option-label="label"
      option-value="value"
      placeholder="Add filter"
      class="w-full sm:w-[16rem]"
      @update:model-value="onAdd"
    />
  </div>
</template>

<script setup lang="ts">
import type { NewsletterAudienceFilter, NewsletterDurationUnit } from '~/types/api'
import { defaultAudienceFilter, NEWSLETTER_DURATION_UNITS } from '~/utils/newsletter-audience'

const props = defineProps<{
  filters: NewsletterAudienceFilter[]
  locked?: boolean
}>()

const emit = defineEmits<{
  'update:filters': [NewsletterAudienceFilter[]]
}>()

const addKind = ref<NewsletterAudienceFilter['type'] | null>(null)

const joinedCmpOptions = [
  { label: 'Members for at least', value: 'atLeast' },
  { label: 'Joined in the last', value: 'inTheLast' },
]

const tierOptions = [
  { label: 'Verified or greater', value: 'verified' },
  { label: 'Premium or greater', value: 'premium' },
]

const addOptions = computed(() => {
  const used = new Set(props.filters.map((filter) => filter.type))
  return [
    { label: "Haven't opened the app", value: 'inactive' as const },
    { label: 'How long they have been members', value: 'joined' as const },
    { label: 'Verified or Premium', value: 'tier' as const },
    { label: "Haven't checked in", value: 'noCheckin' as const },
  ].filter((option) => !used.has(option.value))
})

function replace(index: number, next: NewsletterAudienceFilter) {
  emit('update:filters', props.filters.map((filter, i) => (i === index ? next : filter)))
}

function patchAmount(index: number, raw: number | null) {
  const current = props.filters[index]
  if (!current || current.type === 'tier') return
  const amount = Math.min(3650, Math.max(1, Math.round(raw ?? current.amount)))
  replace(index, { ...current, amount })
}

function patchUnit(index: number, unit: NewsletterDurationUnit) {
  const current = props.filters[index]
  if (!current || current.type === 'tier' || !unit) return
  replace(index, { ...current, unit })
}

function patchJoinedCmp(index: number, cmp: 'atLeast' | 'inTheLast') {
  const current = props.filters[index]
  if (!current || current.type !== 'joined' || !cmp) return
  replace(index, { ...current, cmp })
}

function patchTier(index: number, min: 'verified' | 'premium') {
  const current = props.filters[index]
  if (!current || current.type !== 'tier' || !min) return
  replace(index, { ...current, min })
}

function remove(index: number) {
  emit('update:filters', props.filters.filter((_, i) => i !== index))
}

function onAdd(type: NewsletterAudienceFilter['type'] | null) {
  addKind.value = null
  if (!type || props.filters.some((filter) => filter.type === type)) return
  emit('update:filters', [...props.filters, defaultAudienceFilter(type)])
}
</script>
