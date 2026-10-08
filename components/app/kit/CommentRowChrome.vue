<template>
  <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5" :class="lineClass">
    <slot name="leading" />
    <component
      :is="profileHref ? NuxtLinkComponent : 'span'"
      v-bind="profileHref ? { to: profileHref } : {}"
      :class="nameClass"
      :style="nameStyle"
      @mouseenter="preview?.onEnter?.($event)"
      @mousemove="preview?.onMove?.($event)"
      @mouseleave="preview?.onLeave?.($event)"
    >{{ nameText }}</component>
    <AppVerifiedBadge
      v-if="showBadge"
      :status="author.verifiedStatus"
      :premium="author.premium"
      :premium-plus="author.premiumPlus"
      :is-organization="author.isOrganization"
    />
    <slot name="after-badge" />
    <span :class="separatorClass" aria-hidden="true">·</span>
    <NuxtLink v-if="timeTo" :to="timeTo" :class="timeClass" :title="timeTitle">{{ age }}</NuxtLink>
    <a v-else-if="timeHref" :href="timeHref" :class="timeClass" :title="timeTitle" @click.prevent="emit('time-click')">{{ age }}</a>
    <span v-else :class="timeClass" :title="timeTitle">{{ age }}</span>
    <slot name="trailing" />
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'

type ChromeAuthor = {
  verifiedStatus?: string | null
  premium?: boolean | null
  premiumPlus?: boolean | null
  isOrganization?: boolean | null
}

type PreviewHandlers = {
  onEnter?: (e: MouseEvent) => void
  onMove?: (e: MouseEvent) => void
  onLeave?: (e: MouseEvent) => void
}

withDefaults(defineProps<{
  author: ChromeAuthor
  nameText: string
  /** Renders the name as a profile link when set; otherwise a plain span. */
  profileHref?: string | null
  nameClass?: string
  nameStyle?: Record<string, string>
  showBadge?: boolean
  preview?: PreviewHandlers | null
  age: string
  timeTitle?: string
  /** Internal permalink (NuxtLink). */
  timeTo?: string | null
  /** In-page anchor; click is intercepted and emitted as `time-click`. */
  timeHref?: string | null
  timeClass?: string
  separatorClass?: string
  lineClass?: string
}>(), {
  profileHref: null,
  nameClass: '',
  nameStyle: undefined,
  showBadge: true,
  preview: null,
  timeTitle: undefined,
  timeTo: null,
  timeHref: null,
  timeClass: 'moh-text-soft hover:underline',
  separatorClass: 'moh-text-soft',
  lineClass: '',
})

const emit = defineEmits<{ (e: 'time-click'): void }>()
const NuxtLinkComponent = NuxtLink
</script>
