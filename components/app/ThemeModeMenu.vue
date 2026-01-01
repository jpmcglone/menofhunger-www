<template>
  <div class="inline-flex items-center">
    <Button
      type="button"
      :icon="currentIcon"
      text
      rounded
      severity="secondary"
      aria-label="Theme"
      aria-haspopup="true"
      @click="onToggle"
    />
    <Menu ref="menuRef" :model="items" popup>
      <template #item="{ item, props }">
        <a v-bind="props.action" class="flex items-center gap-2">
          <span v-bind="props.icon" aria-hidden="true" />
          <span v-bind="props.label" class="flex-1">{{ item.label }}</span>
          <span v-if="item.value === preference" class="pi pi-check text-sm" aria-hidden="true" />
        </a>
      </template>
    </Menu>
  </div>
</template>

<script setup lang="ts">
type ModePreference = 'system' | 'light' | 'dark'

const colorMode = useColorMode()

const preference = computed<ModePreference>(() => (colorMode.preference as ModePreference) || 'system')

const currentIcon = computed(() => {
  switch (preference.value) {
    case 'light':
      return 'pi pi-sun'
    case 'dark':
      return 'pi pi-moon'
    case 'system':
    default:
      return 'pi pi-desktop'
  }
})

const items = computed(() => {
  const set = (value: ModePreference) => {
    colorMode.preference = value
  }

  return [
    { label: 'System', icon: 'pi pi-desktop', value: 'system' as const, command: () => set('system') },
    { label: 'Light', icon: 'pi pi-sun', value: 'light' as const, command: () => set('light') },
    { label: 'Dark', icon: 'pi pi-moon', value: 'dark' as const, command: () => set('dark') }
  ]
})

const menuRef = ref<{ toggle: (event: Event) => void } | null>(null)
const onToggle = (event: Event) => menuRef.value?.toggle(event)
</script>

