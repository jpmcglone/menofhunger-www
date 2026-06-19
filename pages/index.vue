<template>
  <div class="relative min-h-full">
    <!-- subtle background -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-400/15 via-amber-400/10 to-transparent blur-3xl" />
      <div class="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-zinc-900/5 via-zinc-700/5 to-transparent blur-3xl dark:from-white/5 dark:via-white/5" />
    </div>

    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <!-- ── Header / Nav ──────────────────────────────────────────── -->
      <header class="pt-8 sm:pt-10">
        <div class="flex items-center justify-between gap-4">
          <!-- Logo + name -->
          <div class="flex shrink-0 items-center gap-3">
            <AppLogo
              :alt="siteConfig.name"
              :width="40"
              :height="40"
              img-class="h-10 w-10 rounded"
            />
            <div class="text-base font-semibold tracking-wide text-gray-900 dark:text-gray-50">
              {{ siteConfig.name }}
            </div>
          </div>

          <!-- Centered nav links (md+) -->
          <nav class="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            <NuxtLink to="/about" class="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50">About</NuxtLink>
            <NuxtLink to="/roadmap" class="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50">Roadmap</NuxtLink>
            <NuxtLink to="/articles" class="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50">Articles</NuxtLink>
          </nav>

          <!-- Right: Log in + Join now -->
          <div class="flex shrink-0 items-center gap-2">
            <NuxtLink
              to="/login"
              class="hidden items-center px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50 sm:inline-flex"
            >
              Log in
            </NuxtLink>
            <NuxtLink to="/login" class="inline-flex">
              <Button class="rounded-full px-5">
                <span class="flex items-center gap-2">
                  <span>Join now</span>
                  <Icon name="tabler:arrow-right" aria-hidden="true" />
                </span>
              </Button>
            </NuxtLink>
          </div>
        </div>
      </header>

      <main>
        <!-- ── Hero ─────────────────────────────────────────────────── -->
        <section class="pb-10 pt-12 sm:pb-14 sm:pt-16">
          <div class="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-16">
            <!-- Left: copy -->
            <div class="flex flex-col justify-center space-y-6">
              <!-- Eyebrow -->
              <div class="inline-flex w-fit items-center gap-2 rounded-full border border-green-200/70 bg-green-50/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-800 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
                <span class="h-1.5 w-1.5 rounded-full bg-green-500/80" aria-hidden="true" />
                Trust-first, men-only
              </div>

              <!-- Headline -->
              <h1 class="text-4xl font-black leading-[1.1] tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
                {{ taglineParts.before }}<span class="text-green-500">{{ taglineParts.keyword }}</span>{{ taglineParts.after }}
              </h1>

              <!-- Sub copy -->
              <p class="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                {{ VOICE.lodgeDescription }}
              </p>

              <!-- CTA buttons -->
              <div class="flex flex-wrap gap-3">
                <NuxtLink to="/login" class="inline-flex">
                  <Button class="rounded-full px-6">
                    <span class="flex items-center gap-2">
                      <span>Join now</span>
                      <Icon name="tabler:arrow-right" aria-hidden="true" />
                    </span>
                  </Button>
                </NuxtLink>
                <NuxtLink to="/home" class="inline-flex">
                  <Button severity="secondary" class="rounded-full px-5">
                    <span class="flex items-center gap-2">
                      <span>Explore the feed</span>
                      <Icon name="tabler:layout-grid" aria-hidden="true" />
                    </span>
                  </Button>
                </NuxtLink>
              </div>

              <!-- Avatar stack + member count -->
              <div v-if="recentlyActiveMen.length" class="flex items-center gap-3">
                <div class="flex -space-x-2">
                  <NuxtLink
                    v-for="man in recentlyActiveMen.slice(0, 7)"
                    :key="man.id"
                    :to="man.username ? `/u/${encodeURIComponent(man.username)}` : '/home'"
                    class="relative inline-flex rounded-full ring-2 ring-white transition-transform duration-150 hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 dark:ring-zinc-950"
                    :aria-label="`View ${man.name || man.username || 'member'} profile`"
                  >
                    <AppUserAvatar
                      :user="man"
                      size-class="h-8 w-8"
                      bg-class="bg-gray-100 dark:bg-zinc-800"
                      :show-presence="false"
                    />
                  </NuxtLink>
                  <!-- M badge -->
                  <div class="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white ring-2 ring-white dark:bg-zinc-700 dark:ring-zinc-950">
                    M
                  </div>
                </div>
                <div v-if="landingSnapshot" class="text-sm text-gray-600 dark:text-gray-300">
                  <span class="font-semibold text-gray-900 dark:text-gray-50">{{ formatLandingCount(landingSnapshot.stats.verifiedMenCount) }}+ men</span>
                  <span class="mx-1.5 opacity-40">·</span>
                  <span class="font-semibold text-gray-900 dark:text-gray-50">{{ formatLandingCount(landingSnapshot.stats.publicPostCount) }}+ posts</span>
                </div>
              </div>
            </div>

            <!-- Right: hero image (light/dark swap via CSS) -->
            <div class="relative min-h-[280px] overflow-hidden rounded-2xl shadow-2xl shadow-black/25 lg:min-h-0">
              <img
                :src="landingLight"
                alt="Men standing on a mountain path"
                class="moh-landing-hero--light absolute inset-0 h-full w-full object-cover"
                draggable="false"
              />
              <img
                :src="landingDark"
                alt="Men standing on a mountain path at night"
                class="moh-landing-hero--dark absolute inset-0 h-full w-full object-cover"
                draggable="false"
              />
            </div>
          </div>
        </section>

        <!-- ── Feature cards ─────────────────────────────────────────── -->
        <section class="py-8 sm:py-10">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <!-- Verified members -->
            <div
              class="rounded-2xl border p-6 shadow-sm"
              style="background-color: rgba(var(--moh-verified-rgb), 0.06); border-color: rgba(var(--moh-verified-rgb), 0.22)"
            >
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style="background-color: rgba(var(--moh-verified-rgb), 0.15)"
              >
                <Icon name="tabler:shield-check" class="text-xl" style="color: var(--moh-verified)" aria-hidden="true" />
              </div>
              <div class="text-base font-bold text-gray-900 dark:text-gray-50">Verified members</div>
              <div class="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">Trust comes first. Every member is verified.</div>
            </div>

            <!-- Daily check-ins -->
            <div
              class="rounded-2xl border p-6 shadow-sm"
              style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.28)"
            >
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style="background-color: rgba(var(--moh-checkin-rgb), 0.18)"
              >
                <Icon name="tabler:calendar-check" class="text-xl" style="color: var(--moh-checkin)" aria-hidden="true" />
              </div>
              <div class="text-base font-bold text-gray-900 dark:text-gray-50">Daily check-ins</div>
              <div class="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">Simple daily prompts keep you consistent.</div>
            </div>

            <!-- Premium groups -->
            <div
              class="rounded-2xl border p-6 shadow-sm"
              style="background-color: rgba(var(--moh-premium-rgb), 0.06); border-color: rgba(var(--moh-premium-rgb), 0.22)"
            >
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style="background-color: rgba(var(--moh-premium-rgb), 0.15)"
              >
                <Icon name="tabler:lock" class="text-xl" style="color: var(--moh-premium)" aria-hidden="true" />
              </div>
              <div class="text-base font-bold text-gray-900 dark:text-gray-50">Premium groups</div>
              <div class="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">Smaller groups for deeper conversations.</div>
            </div>
          </div>
        </section>

        <!-- ── Daily quote ───────────────────────────────────────────── -->
        <div
          v-if="dailyQuote"
          class="py-10 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200 sm:py-12"
        >
          <figure>
            <blockquote class="moh-serif italic">"{{ dailyQuote.text }}"</blockquote>
            <figcaption class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span class="font-semibold">{{ dailyQuoteAttribution }}</span>
              <span v-if="dailyQuote.isParaphrase" class="ml-1">(paraphrase)</span>
            </figcaption>
          </figure>
          <div class="mx-auto mt-6 h-px w-32 bg-gradient-to-r from-transparent via-gray-400 to-transparent dark:via-gray-600" />
        </div>

        <!-- ── How it works ──────────────────────────────────────────── -->
        <section class="py-12 text-center sm:py-16">
          <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">How it works</div>
          <h2 class="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            Simple. Focused. Effective.
          </h2>

          <div class="mx-auto mt-12 max-w-2xl">
            <div class="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-0">
              <!-- Step 1 -->
              <div class="flex flex-1 flex-col items-center gap-3 text-center">
                <div class="relative">
                  <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 dark:bg-white">
                    <Icon name="tabler:user" class="text-xl text-white dark:text-gray-900" aria-hidden="true" />
                  </div>
                  <div class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-white">1</div>
                </div>
                <div>
                  <div class="font-bold text-gray-900 dark:text-gray-50">Join</div>
                  <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">Verify and create your profile.</div>
                </div>
              </div>

              <!-- Connector -->
              <div class="hidden items-start pt-7 sm:flex" style="width: 80px; flex-shrink: 0">
                <div class="w-full border-t-2 border-dashed border-gray-200 dark:border-zinc-700" />
              </div>

              <!-- Step 2 -->
              <div class="flex flex-1 flex-col items-center gap-3 text-center">
                <div class="relative">
                  <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 dark:bg-white">
                    <Icon name="tabler:message-circle" class="text-xl text-white dark:text-gray-900" aria-hidden="true" />
                  </div>
                  <div class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-white">2</div>
                </div>
                <div>
                  <div class="font-bold text-gray-900 dark:text-gray-50">Engage</div>
                  <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">Post, reply, and check in every day.</div>
                </div>
              </div>

              <!-- Connector -->
              <div class="hidden items-start pt-7 sm:flex" style="width: 80px; flex-shrink: 0">
                <div class="w-full border-t-2 border-dashed border-gray-200 dark:border-zinc-700" />
              </div>

              <!-- Step 3 -->
              <div class="flex flex-1 flex-col items-center gap-3 text-center">
                <div class="relative">
                  <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 dark:bg-white">
                    <Icon name="tabler:trending-up" class="text-xl text-white dark:text-gray-900" aria-hidden="true" />
                  </div>
                  <div class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-white">3</div>
                </div>
                <div>
                  <div class="font-bold text-gray-900 dark:text-gray-50">Grow</div>
                  <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">Stay accountable. It compounds.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Top weekly posts ───────────────────────────────────────── -->
        <section v-if="topPostsThisWeek.length > 0" class="mt-16 sm:mt-20">
          <div class="flex items-end justify-between gap-4">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">This week</div>
              <h2 class="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-xl">
                Public posts catching attention
              </h2>
              <p class="mt-1 max-w-xl text-sm text-gray-600 dark:text-gray-300">
                Real conversations, ranked by recent public view activity.
              </p>
            </div>
            <NuxtLink
              to="/home"
              class="hidden items-center gap-1 text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200 sm:inline-flex"
            >
              Open feed
              <Icon name="tabler:arrow-right" class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>

          <TransitionGroup
            name="landing-top-post"
            tag="div"
            class="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4"
          >
            <div
              v-for="(post, i) in featuredTopPosts"
              :key="post.id"
              :ref="(el) => setLandingPostCardEl(i, el)"
              class="landing-top-post-card group relative min-h-[12.5rem] cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-sm shadow-black/[0.04] transition-[border-color,box-shadow] duration-200 ease-out hover:border-gray-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-white/[0.08] dark:bg-zinc-950/55 dark:shadow-black/25 dark:hover:border-white/[0.18]"
              role="link"
              tabindex="0"
              :style="{ '--landing-top-post-delay': `${i * 45}ms` }"
              @click="onLandingPostRowClick(postHref(post), $event)"
              @auxclick="onLandingPostRowAuxClick(postHref(post), $event)"
              @keydown.enter.prevent="navigateTo(postHref(post))"
              @keydown.space.prevent="navigateTo(postHref(post))"
            >
              <div class="pointer-events-none absolute inset-0 z-0 bg-gray-500/[0.02] opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-white/[0.02]" aria-hidden="true" />
              <NuxtLink
                :to="postHref(post)"
                class="absolute inset-0 z-[1] rounded-2xl"
                tabindex="-1"
                aria-hidden="true"
              />

              <div class="relative z-[2] flex h-full flex-col p-4 sm:p-5">
                <div class="flex items-start gap-2.5 sm:gap-3">
                  <NuxtLink
                    :to="authorHref(post)"
                    class="shrink-0"
                    :aria-label="`View @${post.author.username || 'member'} profile`"
                    @click.stop
                  >
                    <AppUserAvatar
                      :user="post.author"
                      size-class="h-10 w-10"
                      bg-class="moh-surface"
                      :enable-preview="false"
                    />
                  </NuxtLink>
                  <div class="min-w-0 flex-1">
                    <div class="flex min-w-0 items-center gap-1.5">
                      <NuxtLink
                        :to="authorHref(post)"
                        class="truncate text-sm font-semibold moh-text hover:underline"
                        @click.stop
                      >
                        {{ post.author.name || post.author.username || 'Member' }}
                      </NuxtLink>
                      <AppVerifiedBadge
                        v-if="post.author.verifiedStatus && post.author.verifiedStatus !== 'none'"
                        :status="post.author.verifiedStatus"
                        :premium="post.author.premium"
                        :premium-plus="post.author.premiumPlus"
                        :show-tooltip="false"
                      />
                    </div>
                    <div class="mt-0.5 truncate text-xs moh-text-muted">
                      @{{ post.author.username || 'member' }}
                    </div>
                  </div>
                  <span
                    class="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-xs font-black tabular-nums"
                    :class="i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'"
                  >
                    {{ i + 1 }}
                  </span>
                </div>

                <div
                  v-if="post.parentId && post.parent?.author?.username"
                  class="mt-2 flex flex-wrap items-center gap-x-1 text-[12px] leading-snug text-gray-500 dark:text-gray-400"
                >
                  <span>Replying to</span>
                  <span
                    class="font-medium"
                    :class="userTierTextClass(userColorTier(post.parent.author), { fallback: 'text-gray-600 dark:text-gray-300' })"
                  >@{{ post.parent.author.username }}</span>
                </div>

                <p class="mt-3 line-clamp-4 text-[15px] leading-6 moh-text">
                  {{ post.body }}
                </p>

                <div class="mt-auto flex items-center gap-3.5 pt-4 text-xs moh-text-muted">
                  <span class="inline-flex items-center gap-1.5 tabular-nums">
                    <Icon name="tabler:message-circle" class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ formatLandingCount(post.commentCount ?? 0) }}
                  </span>
                  <span class="inline-flex items-center gap-1.5 tabular-nums">
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" />
                    </svg>
                    {{ formatLandingCount(post.boostCount) }}
                  </span>
                  <span class="inline-flex items-center gap-1.5 tabular-nums">
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {{ formatLandingCount(post.weeklyViewCount || post.viewerCount || 0) }}
                  </span>
                  <span class="ml-auto inline-flex items-center gap-1 font-semibold moh-text">
                    Read
                    <Icon name="tabler:arrow-up-right" class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <div class="mt-4 sm:hidden">
            <NuxtLink
              to="/home"
              class="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200"
            >
              Open public feed
              <Icon name="tabler:arrow-right" class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>
        </section>

        <!-- ── Articles preview ──────────────────────────────────────── -->
        <section v-if="landingArticlePreviews.length > 0" class="mt-16 sm:mt-20">
          <div class="flex items-end justify-between gap-4">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Read next</div>
              <h2 class="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-xl">
                Articles worth opening
              </h2>
            </div>
            <NuxtLink
              to="/articles?sort=trending"
              class="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200"
            >
              See all
              <Icon name="tabler:arrow-right" class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="article in landingArticlePreviews"
              :key="article.id"
              :to="`/a/${article.id}`"
              class="group relative flex min-h-[11rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-300/70 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:border-orange-300/30 sm:p-5"
            >
              <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <Icon name="tabler:article" class="h-4 w-4 text-orange-600 dark:text-orange-300" aria-hidden="true" />
                <span>{{ article.readingTimeMinutes ? `${article.readingTimeMinutes} min read` : 'Article' }}</span>
              </div>
              <h3 class="mt-3 line-clamp-2 text-base font-bold leading-snug text-gray-900 group-hover:underline dark:text-gray-50">
                {{ article.title }}
              </h3>
              <p v-if="article.excerpt" class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {{ article.excerpt }}
              </p>
              <div class="mt-auto flex items-center justify-between gap-3 pt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span class="truncate">{{ article.author.name || article.author.username }}</span>
                <span class="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200">
                  Read
                  <Icon name="tabler:arrow-up-right" class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </span>
              </div>
            </NuxtLink>
          </div>
        </section>

        <!-- ── Bottom CTA ─────────────────────────────────────────────── -->
        <section class="mt-16 sm:mt-20">
          <div class="relative overflow-hidden rounded-2xl bg-gray-100 text-center dark:bg-gray-950">
            <!-- Mountain background (low opacity, aspect fill) -->
            <img
              :src="mountainLight"
              alt=""
              aria-hidden="true"
              class="moh-mountain-bg--light pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
              draggable="false"
            />
            <img
              :src="mountainDark"
              alt=""
              aria-hidden="true"
              class="moh-mountain-bg--dark pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
              draggable="false"
            />
            <!-- Gradient overlay to keep text readable -->
            <div class="absolute inset-0 bg-gradient-to-b from-gray-100/60 via-gray-100/40 to-gray-100/70 dark:from-gray-950/60 dark:via-gray-950/40 dark:to-gray-950/70" />

            <!-- Content -->
            <div class="relative z-10 px-8 py-14 sm:px-12 sm:py-20">
              <h2 class="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Stop scrolling. Start building.
              </h2>
              <p class="mx-auto mt-4 max-w-lg text-base text-gray-600 dark:text-gray-300">
                Join men choosing real conversation over the noise.
              </p>
              <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <NuxtLink to="/login" class="inline-flex">
                  <Button class="rounded-full px-8">
                    <span class="flex items-center gap-2">
                      <span>Join now</span>
                      <Icon name="tabler:arrow-right" aria-hidden="true" />
                    </span>
                  </Button>
                </NuxtLink>
                <NuxtLink to="/home" class="inline-flex">
                  <Button severity="secondary" class="rounded-full px-6">
                    <span class="flex items-center gap-2">
                      <span>Explore the feed</span>
                      <Icon name="tabler:layout-grid" aria-hidden="true" />
                    </span>
                  </Button>
                </NuxtLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- ── Footer ──────────────────────────────────────────────────── -->
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
            <NuxtLink to="/feeds" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">RSS</NuxtLink>
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

            <div class="max-h-[75vh] overflow-y-auto px-5 pb-6">
              <div class="space-y-4 pb-2">
                <div class="space-y-2">
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Men of Hunger is a community for men who want real conversation and accountability — online and in person.
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
import { userColorTier, userTierTextClass } from '~/utils/user-tier'
import { siteConfig } from '~/config/site'
import { VOICE } from '~/config/voice'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'
import landingLight from '~/assets/images/landing-light.png'
import landingDark from '~/assets/images/landing-dark.png'
import mountainLight from '~/assets/images/mountain-light.png'
import mountainDark from '~/assets/images/mountain-dark.png'
import type { DailyContentToday, DailyQuote, LandingSnapshot, LandingTopPost } from '~/types/api'

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

// Split tagline around "real conversation" to highlight it in green.
const taglineParts = computed(() => {
  const text = VOICE.tagline
  const keyword = 'real conversation'
  const idx = text.indexOf(keyword)
  if (idx === -1) return { before: text, keyword: '', after: '' }
  return {
    before: text.slice(0, idx),
    keyword: text.slice(idx, idx + keyword.length),
    after: text.slice(idx + keyword.length),
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

const { data: landingSnapshotData } = await useAsyncData<LandingSnapshot>(
  'landing:snapshot',
  () => apiFetchData<LandingSnapshot>('/meta/landing', { method: 'GET' }),
  { server: true },
)
const landingSnapshot = computed(() => landingSnapshotData.value ?? null)
const recentlyActiveMen = computed(() => landingSnapshot.value?.recentlyActiveMen ?? [])
const topPostsThisWeek = computed(() => landingSnapshot.value?.topPostsThisWeek ?? [])
const trendingArticles = computed(() => landingSnapshot.value?.trendingArticles ?? [])
const landingArticlePreviews = computed(() => trendingArticles.value.slice(0, 3))

function pickDistinctAuthorPosts(pool: LandingTopPost[], count: number): LandingTopPost[] {
  const seen = new Set<string>()
  const result: LandingTopPost[] = []
  for (const post of pool) {
    if (result.length >= count) break
    const authorId = post.author?.id ?? post.id
    if (!seen.has(authorId)) {
      seen.add(authorId)
      result.push(post)
    }
  }
  for (const post of pool) {
    if (result.length >= count) break
    if (!result.includes(post)) result.push(post)
  }
  return result
}

const clientFeaturedTopPosts = ref<LandingTopPost[] | null>(null)
const featuredTopPosts = computed<LandingTopPost[]>(() => {
  if (clientFeaturedTopPosts.value) return clientFeaturedTopPosts.value
  return pickDistinctAuthorPosts(topPostsThisWeek.value, 3)
})

const { observe: observePost } = usePostViewTracker()
const landingPostCardEls: Array<HTMLElement | null> = []
const landingPostCleanups: Array<() => void> = []

function setLandingPostCardEl(i: number, el: unknown) {
  landingPostCardEls[i] = el instanceof HTMLElement ? el : null
}

function attachLandingPostObservers() {
  for (const fn of landingPostCleanups.splice(0)) fn()
  featuredTopPosts.value.forEach((post, i) => {
    const el = landingPostCardEls[i] ?? null
    if (!el || post.viewerCanAccess === false) return
    const cleanup = observePost(post.id, el)
    if (cleanup) landingPostCleanups.push(cleanup)
  })
}

onMounted(async () => {
  const pool = [...topPostsThisWeek.value]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pool[i] as LandingTopPost
    pool[i] = pool[j] as LandingTopPost
    pool[j] = tmp
  }
  clientFeaturedTopPosts.value = pickDistinctAuthorPosts(pool, 3)
  await nextTick()
  attachLandingPostObservers()
})

onBeforeUnmount(() => {
  for (const fn of landingPostCleanups.splice(0)) fn()
})

function formatLandingCount(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: value >= 1_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

function postHref(post: LandingTopPost): string {
  return `/p/${encodeURIComponent(post.id)}`
}

function authorHref(post: LandingTopPost): string {
  const username = String(post.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : postHref(post)
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(el.closest('a,button,iframe,input,textarea,select,[role="menu"],[role="menuitem"],[data-pc-section]'))
}

function onLandingPostRowClick(href: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onLandingPostRowAuxClick(href: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(href, '_blank')
}

usePageSeo({
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  canonicalPath: '/',
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<!-- Global: light/dark image swap driven by the .dark class on <html> (same pattern as AppLogo) -->
<style>
.moh-landing-hero--dark { display: none; }
.dark .moh-landing-hero--dark { display: block; }
.dark .moh-landing-hero--light { display: none; }

.moh-mountain-bg--dark { display: none; }
.dark .moh-mountain-bg--dark { display: block; }
.dark .moh-mountain-bg--light { display: none; }
</style>

<style scoped>
.landing-top-post-move {
  transition: transform 280ms cubic-bezier(0.2, 0, 0, 1);
}

.landing-top-post-enter-active {
  transition:
    opacity 220ms cubic-bezier(0.2, 0, 0, 1),
    transform 220ms cubic-bezier(0.2, 0, 0, 1);
  transition-delay: var(--landing-top-post-delay, 0ms);
}

.landing-top-post-leave-active {
  position: absolute;
  transition:
    opacity 160ms cubic-bezier(0.2, 0, 0, 1),
    transform 160ms cubic-bezier(0.2, 0, 0, 1);
}

.landing-top-post-enter-from,
.landing-top-post-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
