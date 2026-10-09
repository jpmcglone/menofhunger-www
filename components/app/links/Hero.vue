<template>
  <section class="flex flex-col items-center pt-8 text-center">
    <AppAvatarCircle
      :src="user.avatarUrl"
      :avatar-video="user.avatarVideo ?? null"
      :name="user.name"
      :username="user.username"
      size-class="size-24"
      :round-class="avatarRound"
      :is-organization="user.isOrganization"
      :show-presence="false"
    />
    <h1 class="mt-4 inline-flex max-w-full items-center justify-center gap-1.5 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
      <span class="min-w-0 break-words">{{ displayName }}</span>
      <AppVerifiedBadge
        :status="user.verifiedStatus"
        :premium="user.premium"
        :premium-plus="user.premiumPlus"
        :is-organization="user.isOrganization"
        size="md"
      />
    </h1>
    <p class="mt-0.5 text-sm moh-text-muted">@{{ user.username }}</p>
    <p v-if="bio" class="mt-3 max-w-[460px] text-[15px] leading-relaxed text-gray-800 dark:text-gray-100">
      <AppBioText :text="bio" />
    </p>
    <p v-if="location" class="mt-3 inline-flex items-center gap-1.5 text-sm moh-text-muted">
      <Icon name="tabler:map-pin" class="size-4 shrink-0" aria-hidden="true" />
      <span>{{ location }}</span>
    </p>
  </section>
</template>

<script setup lang="ts">
import type { LinksPage } from '~/types/api'
import { avatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{ user: LinksPage['user'] }>()

const displayName = computed(() => props.user.name?.trim() || `@${props.user.username}`)
const bio = computed(() => props.user.bio?.trim() || '')
const location = computed(() => props.user.locationDisplay?.trim() || '')
const avatarRound = computed(() => avatarRoundClass(props.user.isOrganization))
</script>
