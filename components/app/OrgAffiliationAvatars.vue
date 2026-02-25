<template>
  <div v-if="orgs.length > 0" class="flex items-center gap-0.5">
    <template v-for="(org, i) in visible" :key="org.id">
      <NuxtLink
        v-if="org.username"
        :to="`/u/${org.username}`"
        :style="i > 0 ? { marginLeft: '-4px' } : {}"
        class="relative flex-shrink-0 block"
        :class="zClasses[i]"
        :aria-label="`View ${org.name || org.username} profile`"
      >
        <img
          v-if="org.avatarUrl"
          :src="org.avatarUrl"
          :class="['block object-cover flex-shrink-0 ring-1 ring-white dark:ring-zinc-900', sizeClass, roundClass]"
          :alt="org.name || org.username || 'org'"
        />
        <div v-else :class="['flex-shrink-0 bg-gray-200 dark:bg-zinc-700 ring-1 ring-white dark:ring-zinc-900', sizeClass, roundClass]" />
      </NuxtLink>
      <span
        v-else
        :style="i > 0 ? { marginLeft: '-4px' } : {}"
        class="relative flex-shrink-0"
        :class="zClasses[i]"
      >
        <img
          v-if="org.avatarUrl"
          :src="org.avatarUrl"
          :class="['block object-cover flex-shrink-0 ring-1 ring-white dark:ring-zinc-900', sizeClass, roundClass]"
          :alt="org.name || 'org'"
        />
        <div v-else :class="['flex-shrink-0 bg-gray-200 dark:bg-zinc-700 ring-1 ring-white dark:ring-zinc-900', sizeClass, roundClass]" />
      </span>
    </template>

    <!-- Overflow count -->
    <span
      v-if="overflow > 0"
      :class="[
        'inline-flex flex-shrink-0 items-center justify-center font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-zinc-700 ring-1 ring-white dark:ring-zinc-900',
        sizeClass,
        roundClass,
        overflowTextClass,
      ]"
      style="margin-left: -4px"
    >
      +{{ overflow }}
    </span>
  </div>
</template>

<script setup lang="ts">
type OrgAffiliation = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
}

const props = withDefaults(
  defineProps<{
    orgs: OrgAffiliation[]
    size?: 'xs' | 'sm' | 'md'
    /** Max orgs to show before showing +N overflow. Default: 3. */
    max?: number
  }>(),
  {
    size: 'sm',
    max: 3,
  },
)

const sizeClass = computed(() => {
  if (props.size === 'xs') return 'h-4 w-4'
  if (props.size === 'md') return 'h-6 w-6'
  return 'h-5 w-5'
})

const roundClass = 'rounded-[16%]'

const overflowTextClass = computed(() => {
  if (props.size === 'xs') return 'text-[8px]'
  if (props.size === 'md') return 'text-[10px]'
  return 'text-[9px]'
})

const visible = computed(() => props.orgs.slice(0, props.max))
const overflow = computed(() => Math.max(0, props.orgs.length - props.max))

// Stacked z-index: first item is on top
const zClasses = ['z-30', 'z-20', 'z-10']
</script>
