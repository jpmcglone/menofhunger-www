<template>
  <div class="inline-flex items-center">
    <Button
      type="button"
      text
      rounded
      severity="secondary"
      aria-label="Theme"
      aria-haspopup="true"
      @click="onToggle"
    >
      <template #icon>
        <Icon :name="currentIconName" aria-hidden="true" />
      </template>
    </Button>
    <Menu ref="menuRef" :model="items" popup>
      <template #item="{ item, props }">
        <a v-bind="props.action" class="flex items-center gap-2">
          <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
          <span v-bind="props.label" class="flex-1">{{ item.label }}</span>
          <Icon v-if="item.value === preference" name="tabler:check" class="text-sm" aria-hidden="true" />
        </a>
      </template>
    </Menu>
  </div>
</template>

<script setup lang="ts">
type ModePreference = 'system' | 'light' | 'dark'

const colorMode = useColorMode()

const preference = computed<ModePreference>(() => (colorMode.preference as ModePreference) || 'system')

const currentIconName = computed(() => {
  switch (preference.value) {
    case 'light':
      return 'tabler:sun'
    case 'dark':
      return 'tabler:moon'
    case 'system':
    default:
      return 'tabler:device-desktop'
  }
})

const items = computed(() => {
  const set = (value: ModePreference) => {
    colorMode.preference = value
  }

  return [
    { label: 'System', iconName: 'tabler:device-desktop', value: 'system' as const, command: () => set('system') },
    { label: 'Light', iconName: 'tabler:sun', value: 'light' as const, command: () => set('light') },
    { label: 'Dark', iconName: 'tabler:moon', value: 'dark' as const, command: () => set('dark') }
  ]
})

const menuRef = ref<{ toggle: (event: Event) => void } | null>(null)
const onToggle = (event: Event) => menuRef.value?.toggle(event)
</script>

