<template>
  <AppPageContent top="standard" bottom="standard">
    <div class="mx-auto w-full max-w-2xl px-4 pb-16">

      <!-- Page header -->
      <header class="mb-8">
        <div class="flex items-center gap-2.5 mb-2">
          <Icon name="tabler:rss" class="text-xl text-orange-500" aria-hidden="true" />
          <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            RSS Feeds
          </h1>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Subscribe to Men of Hunger content in any feed reader — Reeder, NetNewsWire, Feedly, and most
          RSS clients pick up feeds automatically when you paste a page URL. Feeds are available in RSS 2.0,
          Atom 1.0, and JSON Feed 1.1.
        </p>
      </header>

      <!-- Global article feeds -->
      <section class="mb-10">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-3">
          Global Article Feeds
        </h2>
        <div class="rounded-lg border border-gray-200 dark:border-zinc-800 divide-y divide-gray-200 dark:divide-zinc-800">
          <div
            v-for="row in globalArticleFeeds"
            :key="row.url"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ row.label }}</p>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-px shrink-0">
                  {{ row.format }}
                </span>
              </div>
              <p class="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5 truncate">{{ row.url }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1 transition-colors"
              @click="copyFeed(row.url)"
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      <!-- Per-author feeds -->
      <section class="mb-10">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1">
          Per-Author Feeds
        </h2>
        <p class="text-sm text-gray-500 dark:text-zinc-400 mb-3">
          Every author has their own article and post feeds. Replace
          <code class="font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">:username</code>
          with any Men of Hunger username.
        </p>
        <div class="rounded-lg border border-gray-200 dark:border-zinc-800 divide-y divide-gray-200 dark:divide-zinc-800">
          <div
            v-for="row in perAuthorFeeds"
            :key="row.url"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ row.label }}</p>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-px shrink-0">
                  {{ row.format }}
                </span>
              </div>
              <p class="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5 truncate">{{ row.url }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1 transition-colors"
              @click="copyFeed(row.url)"
            >
              Copy
            </button>
          </div>
        </div>
        <p class="mt-2 text-xs text-gray-400 dark:text-zinc-500">
          Find a feed copy button on any author's profile via the
          <Icon name="tabler:dots-vertical" class="inline-block text-[11px] align-middle -mt-px mx-px" aria-hidden="true" />
          menu.
        </p>
      </section>

      <!-- Per-topic feeds -->
      <section class="mb-10">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1">
          Per-Topic Feeds
        </h2>
        <p class="text-sm text-gray-500 dark:text-zinc-400 mb-3">
          Subscribe to a single topic. Replace
          <code class="font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">:slug</code>
          with a topic slug, for example
          <code class="font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">discipline</code>,
          <code class="font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">fitness</code>, or
          <code class="font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded text-xs">faith</code>.
        </p>
        <div class="rounded-lg border border-gray-200 dark:border-zinc-800 divide-y divide-gray-200 dark:divide-zinc-800">
          <div
            v-for="row in perTopicFeeds"
            :key="row.url"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ row.label }}</p>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-px shrink-0">
                  {{ row.format }}
                </span>
              </div>
              <p class="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5 truncate">{{ row.url }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1 transition-colors"
              @click="copyFeed(row.url)"
            >
              Copy
            </button>
          </div>
        </div>
        <p class="mt-2 text-xs text-gray-400 dark:text-zinc-500">
          Find the copy button in the header of any topic page.
        </p>
      </section>

      <!-- OPML section -->
      <section class="mb-10">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-1">
          OPML Directory
        </h2>
        <p class="text-sm text-gray-500 dark:text-zinc-400 mb-3">
          Import all available feeds at once into any reader that supports OPML.
        </p>
        <div class="rounded-lg border border-gray-200 dark:border-zinc-800">
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Feed Directory</p>
              <p class="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5">{{ SITE }}/opml.xml</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a
                href="/opml.xml"
                download
                class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1 transition-colors"
              >
                Download
              </a>
              <button
                type="button"
                class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-200 dark:border-zinc-700 rounded px-2.5 py-1 transition-colors"
                @click="copyFeed(`${SITE}/opml.xml`)"
              >
                Copy URL
              </button>
            </div>
          </div>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-zinc-500 leading-relaxed">
        RSS, Atom, and JSON Feed are open syndication formats supported by every major feed reader.
        No account or notification permission is required. Paid-member content appears as a teaser
        with a link to upgrade.
      </p>

    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'RSS Feeds',
})

usePageSeo({
  title: 'RSS Feeds',
  description: 'Subscribe to Men of Hunger articles and posts in any feed reader — available as RSS 2.0, Atom 1.0, and JSON Feed.',
  canonicalPath: '/feeds',
  ogType: 'website',
  image: '/images/banner.png',
})

const SITE = useRequestURL().origin

const globalArticleFeeds = [
  { label: 'Men of Hunger — Articles', url: `${SITE}/articles/feed.xml`, format: 'RSS 2.0' },
  { label: 'Men of Hunger — Articles', url: `${SITE}/articles/feed.atom`, format: 'Atom 1.0' },
  { label: 'Men of Hunger — Articles', url: `${SITE}/articles/feed.json`, format: 'JSON Feed' },
]

const perAuthorFeeds = [
  { label: 'Author Articles', url: `${SITE}/u/:username/articles/feed.xml`, format: 'RSS 2.0' },
  { label: 'Author Articles', url: `${SITE}/u/:username/articles/feed.atom`, format: 'Atom 1.0' },
  { label: 'Author Articles', url: `${SITE}/u/:username/articles/feed.json`, format: 'JSON Feed' },
  { label: 'Author Posts', url: `${SITE}/u/:username/posts/feed.xml`, format: 'RSS 2.0' },
  { label: 'Author Posts', url: `${SITE}/u/:username/posts/feed.atom`, format: 'Atom 1.0' },
  { label: 'Author Posts', url: `${SITE}/u/:username/posts/feed.json`, format: 'JSON Feed' },
]

const perTopicFeeds = [
  { label: 'Topic Articles', url: `${SITE}/topics/:slug/feed.xml`, format: 'RSS 2.0' },
  { label: 'Topic Articles', url: `${SITE}/topics/:slug/feed.atom`, format: 'Atom 1.0' },
  { label: 'Topic Articles', url: `${SITE}/topics/:slug/feed.json`, format: 'JSON Feed' },
]

const { copyText } = useCopyToClipboard()
const toast = useAppToast()

async function copyFeed(url: string) {
  try {
    await copyText(url)
    toast.push({ title: 'Feed URL copied', tone: 'success', durationMs: 1400 })
  } catch {
    toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
  }
}
</script>
