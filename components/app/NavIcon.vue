<template>
  <AppIconGlyph v-if="glyph" :name="glyph" :selected="selected" :size="size" />
  <Icon v-else :name="selected ? (item.iconActive || item.icon) : item.icon" :size="size" />
</template>
<script setup lang="ts">
import type { AppNavItem } from '~/composables/useAppNav'
import type catalog from '~/design/icon-catalog.json'
const props = withDefaults(defineProps<{ item: AppNavItem; selected?: boolean; size?: number }>(), { selected: false, size: 24 })
const mapping: Record<string, keyof typeof catalog> = {
  home: 'home', explore: 'search', messages: 'messages', notifications: 'notifications',
  articles: 'article', groups: 'group', crew: 'crew', bookmarks: 'bookmark',
  spaces: 'navSpaces', 'check-ins': 'streak', fitness: 'fitness', 'only-me': 'onlyMe', scheduled: 'scheduled',
  invite: 'invite', settings: 'settings', feedback: 'reply', profile: 'profile', admin: 'moderation', more: 'more',
}
const glyph = computed(() => mapping[props.item.key])
</script>
