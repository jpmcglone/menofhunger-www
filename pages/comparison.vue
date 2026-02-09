<template>
  <AppPageContent top="standard" bottom="standard">
  <section class="mx-auto w-full px-4">
    <div class="rounded-3xl border border-gray-200 bg-white/70 px-6 py-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50 sm:px-10">
      <p class="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Comparison
      </p>
      <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
        X vs. Men of Hunger
      </h1>
      <p class="mx-auto max-w-2xl text-base text-gray-600 dark:text-gray-300">
        X is the town square. Men of Hunger is the lodge. X gives you reach. Men of Hunger gives you quality.
      </p>
    </div>

    <div class="mt-12">
      <section
        v-for="(section, sectionIdx) in sections"
        :key="section.id"
        :class="[
          'space-y-6',
          sectionIdx === 0 ? '' : 'mt-14 pt-14 border-t border-gray-200 dark:border-zinc-800'
        ]"
      >
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {{ section.title }}
          </h2>
          <p v-if="section.description" class="text-sm text-gray-600 dark:text-gray-300">
            {{ section.description }}
          </p>
        </div>

        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white/70 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
          <table class="w-full table-fixed text-left text-sm">
            <colgroup>
              <col class="w-1/2" />
              <col class="w-1/2" />
            </colgroup>
            <thead class="bg-gray-50/90 dark:bg-zinc-900/70">
              <tr>
                <th class="px-5 py-3.5 font-semibold text-gray-800 dark:text-gray-100">X</th>
                <th class="px-5 py-3.5 font-semibold text-gray-800 dark:text-gray-100">Men of Hunger</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-zinc-700">
              <tr
                v-for="(row, i) in section.rows"
                :key="i"
                class="align-top odd:bg-white/40 even:bg-transparent dark:odd:bg-zinc-900/30"
              >
                <td class="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {{ row.x }}
                </td>
                <td class="px-5 py-4 text-gray-700 dark:text-gray-300">
                  {{ row.moh }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Comparison',
})

usePageSeo({
  title: 'Comparison',
  description: 'How Men of Hunger compares to X (formerly Twitter).',
  canonicalPath: '/comparison',
  ogType: 'website',
})

type ComparisonRow = { x: string; moh: string }
type ComparisonSection = {
  id: string
  title: string
  description?: string
  rows: ComparisonRow[]
}

const sections: ComparisonSection[] = [
  {
    id: 'same',
    title: 'Same foundations',
    description: 'The core social stack exists in both.',
    rows: [
      { x: 'Profiles, follows, and a public feed.', moh: 'Profiles, follows, and a public feed.' },
      { x: 'Short posts with replies.', moh: 'Short posts with replies.' },
      { x: 'Bookmarks and notifications.', moh: 'Bookmarks and notifications.' },
      { x: 'Direct messages.', moh: 'Direct messages between members.' },
      { x: 'Media posts (images/video).', moh: 'Media posts with higher quality for members.' },
      { x: 'Discovery via search and trending.', moh: 'Discovery via search, trending, and topics.' },
      { x: 'Reporting and moderation.', moh: 'Reporting and moderation with admin triage.' },
    ],
  },
  {
    id: 'different',
    title: 'Different by design',
    description: 'Same mechanics, opposite incentives.',
    rows: [
      { x: 'Town square for everyone.', moh: 'The lodge for serious men.' },
      { x: 'Users at scale.', moh: 'Serious men at depth.' },
      { x: 'Reach and virality are the prize.', moh: 'Quality and trust are the prize.' },
      { x: 'Ads and attention drive the product.', moh: 'Membership funds the product.' },
      { x: 'Identity optional; anonymity tolerated.', moh: 'Identity verification to participate fully.' },
      { x: 'Algorithmic boosts and ranking games.', moh: 'Algorithmic neutrality (not boosted, not suppressed).' },
      { x: 'Likes are the primary signal.', moh: 'Boosts are the primary signal.' },
      { x: 'Open DMs and broad exposure.', moh: 'DMs between members and tiered exposure.' },
    ],
  },
  {
    id: 'moh-new',
    title: 'Men of Hunger adds',
    description: 'What X does not offer by default.',
    rows: [
      { x: 'No identity gating.', moh: 'Unverified, Verified, Premium, and Steward tiers.' },
      { x: 'No men-only spaces.', moh: 'Men-only read areas and member-only rooms.' },
      { x: 'No stewardship layer.', moh: 'Steward tier with founder updates and calls.' },
      { x: 'No priority care.', moh: 'Priority support and faster moderation review.' },
      { x: 'No concierge onboarding.', moh: 'Concierge onboarding for stewards.' },
      { x: 'No built-in dialogues.', moh: 'Dialogues for structured, premium discussion.' },
      { x: 'No premium reading/writing tools.', moh: 'Better longform tools and extended edit windows.' },
      { x: 'No private group creation.', moh: 'Private groups, higher caps, and event tools.' },
    ],
  },
]
</script>
