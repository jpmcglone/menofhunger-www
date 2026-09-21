<template>
  <span v-if="action.included" class="membership-action membership-included">Included</span>
  <NuxtLink v-else-if="action.to" :to="action.to" class="membership-action" :class="{ 'membership-primary': action.primary }">
    {{ action.label }}
  </NuxtLink>
  <button v-else type="button" class="membership-action" :class="{ 'membership-primary': action.primary }" :disabled="disabled || busy" :aria-busy="busy" @click="action.tier && emit('checkout', action.tier)">
    {{ busy ? 'Opening checkout…' : action.label }}
  </button>
</template>

<script setup lang="ts">
import type { MembershipAction } from '~/utils/membership'
import type { BillingTier } from '~/types/api'
defineProps<{ action: MembershipAction; disabled?: boolean; busy?: boolean }>()
const emit = defineEmits<{ checkout: [tier: BillingTier] }>()
</script>

<style scoped>
.membership-action { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: center; padding: 11px 16px; border-radius: 999px; background: var(--moh-button-secondary-fill); color: var(--moh-button-secondary-label); font-size: 14px; line-height: 22px; font-weight: 600; text-align: center; }
.membership-primary { background: var(--moh-premium); color: white; }
.membership-included { color: var(--moh-text-muted); background: transparent; }
.membership-action:disabled { opacity: 0.65; cursor: wait; }
a.membership-action:hover, button.membership-action:enabled:hover { filter: brightness(1.08); }
.membership-action:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
</style>
