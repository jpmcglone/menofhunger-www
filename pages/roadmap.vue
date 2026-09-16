<template>
  <AppPageContent top="standard" bottom="standard">
    <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 647:8 (desktop), 650:20544 (mobile) -->
    <section class="mx-auto w-full max-w-[900px] space-y-8 px-5 sm:px-6">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase leading-4 moh-text-muted">{{ roadmapIntro.label }} · {{ roadmapAsOfDate }}</p>
        <h1 class="text-[28px] font-semibold leading-9">{{ roadmapIntro.title }}</h1>
        <p class="text-[15px] leading-[22px] moh-text-muted">{{ roadmapIntro.description }}</p>
        <nav aria-label="Roadmap sections" class="moh-meta flex flex-wrap gap-x-5 gap-y-2">
          <a :href="`#${currentPhase.id}`" class="hover:underline">Current work</a>
          <a href="#milestone-history" class="hover:underline">Milestone history</a>
          <a href="#backlog" class="hover:underline">Backlog</a>
        </nav>
      </header>
      <section :id="currentPhase.id" class="scroll-mt-24 space-y-6" aria-labelledby="current-work-title">
        <div class="space-y-2">
          <h2 id="current-work-title" class="text-xl font-semibold leading-7">Current work</h2>
          <p class="moh-meta">{{ currentPhase.title }} · <time :datetime="currentPhase.datetime">{{ currentPhase.date }}</time></p>
          <p class="moh-meta">{{ currentPhase.description }}</p>
        </div>
        <div v-for="chunk in activeChunks" :key="chunk.title">
          <h3 class="text-xs font-semibold leading-4 moh-text-muted">{{ chunk.title }}</h3>
          <RoadmapItems :items="chunk.items" />
        </div>
        <AppDisclosure v-for="chunk in completedChunks" :key="chunk.title">
          <template #title>{{ chunk.title }} <span class="font-normal moh-text-muted">· {{ chunk.items.length }} additions</span></template>
          <RoadmapItems :items="chunk.items" />
        </AppDisclosure>
      </section>
      <section id="milestone-history" class="scroll-mt-24" aria-labelledby="milestone-history-title">
        <h2 id="milestone-history-title" class="text-xl font-semibold leading-7">Milestone history</h2>
        <p class="moh-meta mt-2 mb-2">Historical targets<template v-if="roadmapOriginalAsOfDate"> · First published {{ roadmapOriginalAsOfDate }}</template></p>
        <AppDisclosure v-for="phase in historicalPhases" :id="phase.id" :key="phase.id" :open="expandedPhase === phase.id" class="scroll-mt-24">
          <template #title><time :datetime="phase.datetime">{{ phase.date }}</time><span class="moh-meta mt-1 block font-normal">{{ phase.title }}</span></template>
          <div class="space-y-6 pb-6">
            <p class="moh-meta">{{ phase.badge }} · {{ phase.description }}</p>
            <div v-for="chunk in phase.chunks" :key="chunk.title">
              <h3 class="text-xs font-semibold leading-4 moh-text-muted">{{ chunk.title }}</h3>
              <RoadmapItems :items="chunk.items" />
            </div>
          </div>
        </AppDisclosure>
      </section>
      <section id="backlog" class="scroll-mt-24" aria-labelledby="backlog-title">
        <h2 id="backlog-title" class="text-xl font-semibold leading-7">{{ roadmapBacklog.title }}</h2>
        <p class="moh-meta mt-2">{{ roadmapBacklog.badge }} · {{ roadmapBacklog.description }}</p>
        <AppDisclosure v-for="chunk in roadmapBacklog.chunks" :key="chunk.title">
          <template #title>{{ chunk.title }} <span class="font-normal moh-text-muted">· {{ chunk.items.length }} items</span></template>
          <RoadmapItems :items="chunk.items" />
        </AppDisclosure>
      </section>
      <footer class="space-y-4">
        <p class="moh-meta">{{ roadmapFooterDisclaimer }}</p>
        <nav aria-label="More about Men of Hunger" class="moh-meta flex flex-wrap gap-x-5 gap-y-2">
          <NuxtLink v-for="link in [{ to: '/about', label: 'About' }, { to: '/tiers', label: 'Membership' }, { to: '/feedback', label: 'Feedback' }, { to: '/status', label: 'Status' }]" :key="link.to" :to="link.to" class="hover:underline">{{ link.label }}</NuxtLink>
        </nav>
      </footer>
    </section>
  </AppPageContent>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import {
  roadmapAsOfDate,
  roadmapOriginalAsOfDate,
  roadmapIntro,
  roadmapPhases,
  roadmapBacklog,
  roadmapFooterDisclaimer,
  roadmapMetaDescription,
  getRoadmapJsonLd
} from '~/config/roadmap.data'

definePageMeta({
  layout: 'app',
  title: 'Roadmap',
})

const canonicalPath = '/roadmap'
const roadmapJsonLd = getRoadmapJsonLd(`${siteConfig.url}${canonicalPath}`)

usePageSeo({
  title: 'Roadmap',
  description: roadmapMetaDescription,
  canonicalPath,
  ogType: 'website',
  image: '/images/logo-black-bg-small.png',
  jsonLdGraph: [roadmapJsonLd],
})

useHead({
  meta: [
    {
      name: 'keywords',
      content: 'Men of Hunger roadmap, product roadmap, upcoming features, new features, community roadmap, app features'
    }
  ]
})

const route = useRoute()
const currentPhase = roadmapPhases.find(phase => phase.isHighlight) ?? roadmapPhases[0]!
const historicalPhases = roadmapPhases.filter(phase => phase !== currentPhase)
const activeChunks = currentPhase.chunks.filter(chunk => chunk.items.some(item => !item.done))
const completedChunks = currentPhase.chunks.filter(chunk => chunk.items.every(item => item.done))
const expandedPhase = ref('')
// Hashes are not available to SSR. Open the target only after hydration.
onMounted(() => { expandedPhase.value = route.hash.slice(1) })
watch(() => route.hash, hash => { expandedPhase.value = hash.slice(1) })
</script>
