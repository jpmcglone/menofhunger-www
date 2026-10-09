<template>
  <section class="rounded-2xl border moh-border bg-[var(--moh-surface)] p-5">
    <div class="flex items-center gap-3">
      <AppAvatarCircle
        :src="user.avatarUrl"
        :avatar-video="user.avatarVideo ?? null"
        :name="user.name"
        :username="user.username"
        size-class="size-10"
        :round-class="avatarRound"
        :is-organization="user.isOrganization"
        :show-presence="false"
      />
      <h2 class="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-50">
        {{ firstName }} invited you to {{ siteName }}
      </h2>
    </div>
    <p class="mt-3 text-[15px] leading-relaxed moh-text-muted">
      A community of men building faith, family, and strength together. Free to join.
    </p>
    <Button
      as="NuxtLink"
      :to="joinHref"
      :label="`Join ${siteName}`"
      rounded
      class="mt-4 w-full min-h-11"
    />
    <p class="mt-3 text-center text-sm moh-text-muted">
      Already a member?
      <NuxtLink to="/login" class="font-semibold text-gray-900 underline underline-offset-2 dark:text-gray-50">Log in</NuxtLink>
    </p>
  </section>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import type { LinksPage } from '~/types/api'
import { avatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{
  user: LinksPage['user']
  firstName: string
  joinHref: string
}>()

const siteName = siteConfig.name
const avatarRound = computed(() => avatarRoundClass(props.user.isOrganization))
</script>
