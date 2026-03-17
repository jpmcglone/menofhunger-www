<template>
  <div class="relative min-h-full">
    <!-- subtle background -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-400/15 via-amber-400/10 to-transparent blur-3xl" />
      <div class="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-zinc-900/5 via-zinc-700/5 to-transparent blur-3xl dark:from-white/5 dark:via-white/5" />
    </div>

    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <!-- top: same logo as app layout -->
      <header class="pt-10 sm:pt-14">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <AppLogo
              :alt="siteConfig.name"
              :light-src="logoLightSmall"
              :dark-src="logoDarkSmall"
              :width="48"
              :height="48"
              img-class="h-12 w-12 rounded"
            />
            <div class="text-lg font-semibold tracking-wide text-gray-900 dark:text-gray-50">
              {{ siteConfig.name }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <NuxtLink to="/login" class="inline-flex">
              <Button class="rounded-full">
                <span class="flex items-center gap-2">
                  <span>Log in</span>
                  <Icon name="tabler:arrow-right" aria-hidden="true" />
                </span>
              </Button>
            </NuxtLink>
          </div>
        </div>
      </header>

      <!-- hero -->
      <main class="pt-10 sm:pt-14 pb-10 sm:pb-14">
        <div class="grid gap-10 lg:grid-cols-2 lg:gap-14 items-stretch">
          <div class="space-y-6 flex flex-col min-h-0">
            <div class="inline-flex items-center gap-2 rounded-full border border-green-200/70 bg-green-50/60 px-3 py-1 text-xs font-semibold tracking-wide text-green-800 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200">
              <span class="h-1.5 w-1.5 rounded-full bg-green-500/80" aria-hidden="true" />
              Trust-first, men-only
            </div>

            <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50">
              {{ VOICE.tagline }}
            </h1>

            <p class="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-200">
              {{ VOICE.lodgeDescription }}
            </p>

            <div class="flex flex-col sm:flex-row gap-3">
              <NuxtLink to="/login" class="inline-flex">
                <Button class="w-full sm:w-auto rounded-full px-6">
                  <span class="flex items-center gap-2">
                    <span>Join now</span>
                    <Icon name="tabler:arrow-right" aria-hidden="true" />
                  </span>
                </Button>
              </NuxtLink>
              <NuxtLink to="/home" class="inline-flex">
                <Button severity="secondary" class="w-full sm:w-auto rounded-full px-6">
                  <span class="flex items-center gap-2">
                    <span>See what's happening</span>
                    <Icon name="tabler:eye" aria-hidden="true" />
                  </span>
                </Button>
              </NuxtLink>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NuxtLink
                to="/explore"
                class="group rounded-xl border border-gray-200 bg-white/70 px-4 py-3 shadow-sm transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-900/40"
              >
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Icon name="tabler:compass" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  Explore
                </div>
                <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Find public conversations by topic.
                </div>
              </NuxtLink>
              <NuxtLink
                to="/home"
                class="group rounded-xl border border-gray-200 bg-white/70 px-4 py-3 shadow-sm transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-900/40"
              >
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Icon name="tabler:home" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  Public feed
                </div>
                <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Read what members are building right now.
                </div>
              </NuxtLink>
              <NuxtLink
                to="/articles?sort=trending"
                class="group rounded-xl border border-gray-200 bg-white/70 px-4 py-3 shadow-sm transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-900/40"
              >
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Icon name="tabler:article" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  Articles
                </div>
                <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Read longform from the community.
                </div>
              </NuxtLink>
            </div>

            <!-- Pillars: 3 compact cards mirroring the DailyCheckinCard style -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div class="rounded-xl border px-4 py-3" style="background-color: rgba(var(--moh-verified-rgb), 0.06); border-color: rgba(var(--moh-verified-rgb), 0.25)">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style="background-color: rgba(var(--moh-verified-rgb), 0.15)">
                    <Icon name="tabler:shield-check" class="text-sm" style="color: var(--moh-verified)" aria-hidden="true" />
                  </div>
                  <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--moh-verified); opacity: 0.85">Verify</div>
                </div>
                <div class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-50">{{ VOICE.onboarding.verifyHeading }}</div>
                <div class="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{{ VOICE.onboarding.verifyBody }}</div>
              </div>
              <div class="rounded-xl border px-4 py-3" style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style="background-color: rgba(var(--moh-checkin-rgb), 0.18)">
                    <Icon name="tabler:flame" class="text-sm" style="color: var(--moh-checkin)" aria-hidden="true" />
                  </div>
                  <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--moh-checkin); opacity: 0.85">Streaks</div>
                </div>
                <div class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-50">{{ VOICE.onboarding.showUpDaily }}</div>
                <div class="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{{ VOICE.onboarding.streakBody }}</div>
              </div>
              <div class="rounded-xl border px-4 py-3" style="background-color: rgba(var(--moh-premium-rgb), 0.06); border-color: rgba(var(--moh-premium-rgb), 0.25)">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style="background-color: rgba(var(--moh-premium-rgb), 0.15)">
                    <Icon name="tabler:crown" class="text-sm" style="color: var(--moh-premium)" aria-hidden="true" />
                  </div>
                  <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--moh-premium); opacity: 0.85">Premium</div>
                </div>
                <div class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-50">Go deeper.</div>
                <div class="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">Cohorts, workshops, playbooks, media posts, polls, and premium-only conversations.</div>
              </div>
            </div>

            <!-- local meetup card -->
            <div class="hidden sm:block w-full rounded-xl border border-gray-200 bg-white/70 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 sm:p-6">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Local meetup</div>
                  <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">Looking for the Roanoke, VA meetup?</div>
                </div>
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-2 rounded-full border border-orange-200/70 bg-orange-50/60 px-4 py-2 text-sm font-semibold text-orange-800 shadow-sm transition-colors hover:bg-orange-100/70 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/15"
                  @click="isRoanokeOpen = true"
                >
                  <Icon name="tabler:map-pin" aria-hidden="true" />
                  <span>Open details</span>
                  <Icon name="tabler:chevron-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <!-- right rail -->
          <div class="space-y-4">
            <!-- How it works -->
            <div class="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                  <Icon name="tabler:route" aria-hidden="true" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">How it works</div>
                  <div class="text-xs text-gray-600 dark:text-gray-300">Fast to join. Built for trust.</div>
                </div>
              </div>

              <ol class="mt-5 space-y-3 text-sm">
                <li class="flex gap-3">
                  <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900/10 text-xs font-black text-gray-900 dark:bg-white/10 dark:text-gray-50">1</span>
                  <span class="text-gray-700 dark:text-gray-200"><strong>Join</strong> with your phone number.</span>
                </li>
                <li class="flex gap-3">
                  <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900/10 text-xs font-black text-gray-900 dark:bg-white/10 dark:text-gray-50">2</span>
                  <span class="text-gray-700 dark:text-gray-200"><strong>Set up your profile</strong> — username, interests, photo.</span>
                </li>
                <li class="flex gap-3">
                  <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900/10 text-xs font-black text-gray-900 dark:bg-white/10 dark:text-gray-50">3</span>
                  <span class="text-gray-700 dark:text-gray-200"><strong>Read, follow, boost</strong> — start before verification.</span>
                </li>
                <li class="flex gap-3">
                  <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style="background-color: var(--moh-verified-soft); color: var(--moh-verified)">
                    <span class="text-xs font-black">4</span>
                  </span>
                  <span class="text-gray-700 dark:text-gray-200"><strong class="text-[var(--moh-verified)]">Verify</strong> to post, reply, and unlock check-in streaks.</span>
                </li>
                <li class="flex gap-3">
                  <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900/10 text-xs font-black text-gray-900 dark:bg-white/10 dark:text-gray-50">5</span>
                  <span class="text-gray-700 dark:text-gray-200"><strong>Show up.</strong> Consistency is the game.</span>
                </li>
              </ol>

              <div class="mt-5">
                <NuxtLink to="/login" class="inline-flex w-full sm:w-auto">
                  <Button class="w-full sm:w-auto rounded-full">
                    <span class="flex items-center gap-2">
                      <span>Join now</span>
                      <Icon name="tabler:arrow-right" aria-hidden="true" />
                    </span>
                  </Button>
                </NuxtLink>
              </div>
            </div>

            <!-- Trust card -->
            <div class="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-800 dark:text-orange-200">
                  <Icon name="tabler:shield-check" aria-hidden="true" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Trust-first by design</div>
                  <div class="text-xs text-gray-600 dark:text-gray-300">A small set of rules that scale.</div>
                </div>
              </div>
              <ul class="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <li class="flex gap-3">
                  <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--moh-verified)]" aria-hidden="true" />
                  <span>Participation requires <span class="font-medium text-[var(--moh-verified)]">verification</span>. Unverified accounts see only public posts.</span>
                </li>
                <li class="flex gap-3">
                  <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--moh-premium)]" aria-hidden="true" />
                  <span><span class="font-medium text-[var(--moh-premium)]">Premium</span> tiers are neutral — no boosted reach, no special power.</span>
                </li>
                <li class="flex gap-3">
                  <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-500" aria-hidden="true" />
                  <span>Quality is non-negotiable. We keep it that way.</span>
                </li>
              </ul>
            </div>

            <!-- Quote of the day -->
            <div
              v-if="dailyQuote"
              class="mt-8 py-2 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200"
            >
              <figure>
                <blockquote class="italic moh-serif">"{{ dailyQuote.text }}"</blockquote>
                <figcaption class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span class="font-semibold">{{ dailyQuoteAttribution }}</span>
                  <span v-if="dailyQuote.isParaphrase" class="ml-1">(paraphrase)</span>
                </figcaption>
              </figure>
              <div class="mt-6 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent" />
            </div>
          </div>
        </div>

        <!-- Badges -->
        <section class="mt-16 sm:mt-20">
          <h2 class="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-xl">
            Badges you'll see
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium text-[var(--moh-verified)]">Verified</span>, <span class="font-medium text-[var(--moh-premium)]">Premium</span>, and <span class="font-medium text-[var(--moh-org)]">org accounts</span> — each has a distinct badge.
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-6 sm:gap-8">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[var(--moh-verified)]">Verified</span>
              <AppVerifiedBadge status="manual" :premium="false" :premium-plus="false" :is-organization="false" size="md" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[var(--moh-premium)]">Premium</span>
              <AppVerifiedBadge status="manual" :premium="true" :premium-plus="false" :is-organization="false" size="md" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[var(--moh-org)]">Org account</span>
              <NuxtLink
                v-if="orgProfile"
                :to="`/u/${encodeURIComponent(orgProfile.username ?? 'menofhunger')}`"
                class="inline-flex items-center gap-2 rounded-full border border-[var(--moh-org)]/40 bg-[rgba(var(--moh-org-rgb),0.08)] pl-1 pr-3 py-1.5 transition-colors hover:bg-[rgba(var(--moh-org-rgb),0.14)] dark:border-[var(--moh-org)]/30 dark:bg-[rgba(var(--moh-org-rgb),0.12)]"
              >
                <AppUserAvatar
                  :user="{ id: orgProfile.id, avatarUrl: orgProfile.avatarUrl, name: orgProfile.name, username: orgProfile.username, isOrganization: orgProfile.isOrganization }"
                  size-class="h-7 w-7"
                  :show-presence="false"
                  :enable-preview="false"
                />
                <span class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ orgProfile.name ?? orgProfile.username ?? 'Men of Hunger' }}</span>
                <AppVerifiedBadge :is-organization="true" status="manual" size="sm" />
              </NuxtLink>
              <span v-else class="inline-flex items-center gap-2">
                <AppVerifiedBadge :is-organization="true" status="manual" size="md" />
                <NuxtLink to="/u/menofhunger" class="text-sm text-gray-500 hover:underline dark:text-gray-400">e.g. @menofhunger</NuxtLink>
              </span>
            </div>
          </div>
        </section>

        <!-- Trending articles -->
        <section v-if="trendingArticles.length > 0" class="mt-16 sm:mt-20">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-xl">
                Trending Articles
              </h2>
            </div>
            <NuxtLink
              to="/articles?sort=trending"
              class="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200"
            >
              Browse all
              <Icon name="tabler:arrow-right" class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="(article, i) in trendingArticles"
              :key="article.id"
              :to="`/a/${article.id}`"
              class="group relative flex flex-col rounded-2xl border border-gray-200 bg-white/70 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-950/30 overflow-hidden"
            >
              <!-- thumbnail -->
              <div v-if="article.thumbnailUrl" class="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
                <img
                  :src="article.thumbnailUrl"
                  :alt="article.title"
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                >
                <div
                  class="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black tabular-nums leading-none shadow-sm"
                  :class="i === 0
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                    : 'bg-white/90 text-gray-600 dark:bg-zinc-900/80 dark:text-zinc-400'"
                >{{ i + 1 }}</div>
              </div>
              <div v-else class="relative flex aspect-[16/9] w-full items-center justify-center bg-gray-100 dark:bg-zinc-800">
                <Icon name="tabler:article" class="text-2xl text-gray-300 dark:text-zinc-600" aria-hidden="true" />
                <div
                  class="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black tabular-nums leading-none shadow-sm"
                  :class="i === 0
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                    : 'bg-white/90 text-gray-600 dark:bg-zinc-900/80 dark:text-zinc-400'"
                >{{ i + 1 }}</div>
              </div>

              <div class="flex flex-1 flex-col p-4">
                <p class="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100 group-hover:underline">
                  {{ article.title }}
                </p>
                <p v-if="article.excerpt" class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                  {{ article.excerpt }}
                </p>
                <div class="mt-auto pt-3 flex items-center gap-2">
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ article.author.name || article.author.username }}
                  </span>
                  <span v-if="article.readingTimeMinutes" class="text-xs text-gray-400 dark:text-gray-500">
                    · {{ article.readingTimeMinutes }} min read
                  </span>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div class="mt-4 sm:hidden">
            <NuxtLink
              to="/articles?sort=trending"
              class="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200"
            >
              Browse all articles
              <Icon name="tabler:arrow-right" class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>
        </section>

        <!-- What you can do (condensed) -->
        <section class="mt-12 sm:mt-16">
          <h2 class="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-xl">
            What you can do
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium text-[var(--moh-verified)]">Verified</span> (blue) or <span class="font-medium text-[var(--moh-premium)]">Premium</span> (orange). Read the feed and bookmark without verification.
          </p>
          <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            <div class="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 sm:p-5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900/10 text-gray-800 dark:bg-white/10 dark:text-gray-200">
                <Icon name="tabler:home" aria-hidden="true" />
              </div>
              <div class="mt-3 font-semibold text-gray-900 dark:text-gray-50">Read the feed</div>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Browse public posts, articles, and profiles. Follow people. No verification required.
              </p>
              <NuxtLink to="/home" class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:underline dark:text-gray-200">
                Try it <Icon name="tabler:arrow-right" class="h-3.5 w-3.5" aria-hidden="true" />
              </NuxtLink>
            </div>
            <div class="rounded-2xl border border-[var(--moh-verified)]/30 bg-[rgba(var(--moh-verified-rgb),0.06)] p-4 shadow-sm dark:bg-[rgba(var(--moh-verified-rgb),0.1)] dark:border-[var(--moh-verified)]/25 sm:p-5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--moh-verified-soft)] text-[var(--moh-verified)] dark:bg-[rgba(var(--moh-verified-rgb),0.2)]">
                <Icon name="tabler:plus" size="28" class="opacity-90" aria-hidden="true" />
              </div>
              <div class="mt-3 font-semibold text-[var(--moh-verified)]">Post, reply, boost</div>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <span class="font-medium text-[var(--moh-verified)]">Verified</span> — share ideas, reply to threads, and boost posts worth seeing.
              </p>
            </div>
            <div class="rounded-2xl border border-[var(--moh-verified)]/30 bg-[rgba(var(--moh-verified-rgb),0.06)] p-4 shadow-sm dark:bg-[rgba(var(--moh-verified-rgb),0.1)] dark:border-[var(--moh-verified)]/25 sm:p-5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" style="background-color: rgba(var(--moh-checkin-rgb), 0.18)">
                <Icon name="tabler:calendar-check" aria-hidden="true" style="color: var(--moh-checkin)" />
              </div>
              <div class="mt-3 font-semibold text-[var(--moh-verified)]">Daily check-ins & streaks</div>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <span class="font-medium text-[var(--moh-verified)]">Verified</span> — daily prompts, coin rewards, and streak multipliers for consistency.
              </p>
            </div>
            <div class="rounded-2xl border border-[var(--moh-verified)]/30 bg-[rgba(var(--moh-verified-rgb),0.06)] p-4 shadow-sm dark:bg-[rgba(var(--moh-verified-rgb),0.1)] dark:border-[var(--moh-verified)]/25 sm:p-5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--moh-verified-soft)] text-[var(--moh-verified)] dark:bg-[rgba(var(--moh-verified-rgb),0.2)]">
                <Icon name="tabler:message-circle" aria-hidden="true" />
              </div>
              <div class="mt-3 font-semibold text-[var(--moh-verified)]">Chat & spaces</div>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <span class="font-medium text-[var(--moh-verified)]">Verified</span> — DMs, group conversations, and live spaces with music.
              </p>
            </div>
            <div class="rounded-2xl border border-[var(--moh-premium)]/30 bg-[rgba(var(--moh-premium-rgb),0.06)] p-4 shadow-sm dark:bg-[rgba(var(--moh-premium-rgb),0.1)] dark:border-[var(--moh-premium)]/25 sm:p-5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--moh-premium-soft)] text-[var(--moh-premium)] dark:bg-[rgba(var(--moh-premium-rgb),0.2)]">
                <Icon name="tabler:photo" aria-hidden="true" />
              </div>
              <div class="mt-3 font-semibold text-[var(--moh-premium)]">Media, polls & articles</div>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <span class="font-medium text-[var(--moh-premium)]">Premium</span> — GIFs, images, videos, polls, and longform articles.
              </p>
            </div>
            <div class="rounded-2xl border border-[var(--moh-premium)]/30 bg-[rgba(var(--moh-premium-rgb),0.06)] p-4 shadow-sm dark:bg-[rgba(var(--moh-premium-rgb),0.1)] dark:border-[var(--moh-premium)]/25 sm:p-5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--moh-premium-soft)] text-[var(--moh-premium)] dark:bg-[rgba(var(--moh-premium-rgb),0.2)]">
                <Icon name="tabler:lock" aria-hidden="true" />
              </div>
              <div class="mt-3 font-semibold text-[var(--moh-premium)]">Premium-only conversations</div>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                <span class="font-medium text-[var(--moh-premium)]">Premium</span> — create posts and articles visible only to premium members.
              </p>
            </div>
          </div>
        </section>

        <!-- Bottom CTA -->
        <section class="mt-16 sm:mt-20 text-center">
          <div class="rounded-2xl border border-gray-200 bg-white/70 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 sm:p-12">
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-gray-50">
              Stop scrolling. Start building.
            </h2>
            <p class="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
              No algorithms. No pay-to-win. A feed, verification, real conversation — and a path to measurable progress.
            </p>
            <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <NuxtLink to="/login" class="inline-flex">
                <Button class="rounded-full px-8">
                  <span class="flex items-center gap-2">
                    <span>Join now</span>
                    <Icon name="tabler:arrow-right" aria-hidden="true" />
                  </span>
                </Button>
              </NuxtLink>
              <NuxtLink to="/articles?sort=trending" class="inline-flex">
                <Button severity="secondary" class="rounded-full px-6">
                  <span class="flex items-center gap-2">
                    <span>Read articles</span>
                    <Icon name="tabler:article" aria-hidden="true" />
                  </span>
                </Button>
              </NuxtLink>
            </div>
          </div>
        </section>
      </main>

      <footer class="pb-10 sm:pb-14" role="contentinfo">
        <nav aria-label="Sitemap" class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6 text-sm text-gray-600 dark:border-zinc-800 dark:text-gray-300">
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ClientOnly>
              <AppThemeModeMenu />
            </ClientOnly>
            <NuxtLink to="/about" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">About</NuxtLink>
            <NuxtLink to="/tiers" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Tiers</NuxtLink>
            <NuxtLink to="/articles" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Articles</NuxtLink>
            <NuxtLink to="/roadmap" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Roadmap</NuxtLink>
            <NuxtLink to="/status" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Status</NuxtLink>
            <a
              :href="siteConfig.social.xUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-gray-700 hover:underline dark:text-gray-200"
            >
              Follow on X
            </a>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            © {{ currentYear }} {{ siteConfig.name }}
          </div>
        </nav>
      </footer>
    </div>

    <!-- Roanoke bottom sheet (teleported) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isRoanokeOpen"
          class="fixed inset-0 z-[100] bg-black/50"
          role="presentation"
          @click="isRoanokeOpen = false"
        />
      </Transition>

      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="isRoanokeOpen"
          class="fixed inset-x-0 bottom-0 z-[101] flex justify-center px-3 pb-[var(--moh-safe-bottom,0px)]"
          role="dialog"
          aria-modal="true"
          aria-label="Roanoke meetup"
          @click="isRoanokeOpen = false"
        >
          <div
            class="w-full max-w-xl rounded-t-2xl border border-orange-200/70 bg-orange-50/60 shadow-2xl dark:border-orange-500/20 dark:bg-orange-500/10"
            @click.stop
          >
            <div class="flex items-center justify-between px-5 py-4">
              <div class="flex items-center gap-3">
                <AppLogo
                  :alt="siteConfig.name"
                  :light-src="logoLightSmall"
                  :dark-src="logoDarkSmall"
                  :width="32"
                  :height="32"
                  img-class="h-8 w-8 rounded"
                />
                <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Men of Hunger: Roanoke
                </div>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-950/40 dark:hover:text-gray-50"
                aria-label="Close"
                @click="isRoanokeOpen = false"
              >
                <Icon name="tabler:x" aria-hidden="true" />
              </button>
            </div>

            <div class="px-5 pb-6 max-h-[75vh] overflow-y-auto">
              <div class="space-y-4 pb-2">
                <div class="space-y-2">
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Men of Hunger is a trusted community for men who want measurable progress — online and in person.
                    We meet to think clearly, speak honestly, and help one another move our missions forward.
                  </p>
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Events range from open discussions (like <span class="font-medium">Estuary</span>) to learning sessions, service projects, and accountability groups.
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <a :href="roanokeMeetupUrl" target="_blank" rel="noopener noreferrer" class="inline-flex w-full">
                    <Button class="w-full rounded-full">
                      <span class="flex w-full items-center justify-center gap-2">
                        <span>Open on meetup.com</span>
                        <Icon name="tabler:external-link" class="opacity-80" aria-hidden="true" />
                      </span>
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { VOICE } from '~/config/voice'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'
import logoLightSmall from '~/assets/images/logo-white-bg-small.png'
import logoDarkSmall from '~/assets/images/logo-black-bg-small.png'
import type { Article, DailyContentToday, DailyQuote, PublicProfile } from '~/types/api'

definePageMeta({
  layout: 'empty'
})

useHead({
  htmlAttrs: { class: 'moh-landing' }
})

const roanokeMeetupUrl = siteConfig.social.meetup
const currentYear = new Date().getUTCFullYear()
const isRoanokeOpen = ref(false)

watch(isRoanokeOpen, (open) => {
  if (import.meta.client) {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})

const { apiFetchData } = useApiClient()
const { dayKey: dailyContentDayKey } = useEasternMidnightRollover()

const {
  data: dailyContent,
  refresh: refreshDailyContent,
} = await useAsyncData<DailyContentToday>(
  'landing:daily-content:today',
  () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
  { server: true },
)
const dailyQuote = computed<DailyQuote | null>(() => dailyContent.value?.quote ?? null)
const dailyQuoteAttribution = computed(() => (dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value) : ''))

watch(
  () => dailyContentDayKey.value,
  async (next, prev) => {
    if (!import.meta.client) return
    if (!prev) return
    if (next === prev) return
    await refreshDailyContent()
  },
)

// Trending public articles (SSR-safe, no login required)
const { data: trendingArticlesData } = await useAsyncData<Article[]>(
  'landing:trending-articles',
  () => apiFetchData<Article[]>('/articles', {
    query: { limit: 6, sort: 'trending', visibility: 'public' },
  }),
  { server: true },
)
const trendingArticles = computed(() => trendingArticlesData.value ?? [])

// Org account badge example
const ORG_USERNAME = 'menofhunger'
const { data: orgProfileData } = await useAsyncData<PublicProfile>(
  `landing:org-profile:${ORG_USERNAME}`,
  () => apiFetchData<PublicProfile>(`/users/${encodeURIComponent(ORG_USERNAME)}`, { method: 'GET' }),
  { server: true },
)
const orgProfile = computed(() => orgProfileData.value ?? null)

usePageSeo({
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  canonicalPath: '/',
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>
