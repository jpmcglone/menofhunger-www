<template>
  <AppPageContent class="h-full min-h-0" bottom="standard">
    <div class="h-full min-h-0">
      <template v-if="isFullWidthRoute">
        <main class="h-full overflow-y-auto">
          <NuxtPage />
        </main>
      </template>

      <div v-else class="grid h-full min-h-0 grid-cols-1 md:grid-cols-[22rem_1fr]">
        <!-- Desktop sidebar -->
        <aside class="hidden md:block h-full overflow-y-auto border-r moh-border">
          <div class="py-4">
            <div class="px-4 pb-3 text-lg font-semibold">Admin</div>
            <div class="space-y-1">
              <template v-for="section in adminSections" :key="section.title">
                <div class="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {{ section.title }}
                </div>
                <div class="moh-divide">
                  <NuxtLink
                    v-for="item in section.items"
                    :key="item.key"
                    :to="item.to"
                    :class="sidebarRowClass(item)"
                  >
                    <div class="flex items-center gap-3">
                      <Icon :name="item.icon" class="text-lg text-[var(--moh-text-muted)]" aria-hidden="true" />
                      <div class="min-w-0 flex-1 flex items-center justify-between gap-2 font-semibold">
                        <span class="truncate">{{ item.label }}</span>
                        <span v-if="item.key === 'verification' && pendingVerifications" class="rounded-full moh-surface-2 px-2 text-sm tabular-nums" :aria-label="`${pendingVerifications} pending requests`">{{ pendingVerifications }}</span>
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </template>
            </div>
          </div>
        </aside>

        <!-- Right pane: child route, or the mobile-only home list -->
        <main class="h-full overflow-y-auto">
          <template v-if="route.path === '/admin'">
            <NuxtLink v-if="pendingVerifications" to="/admin/verification" class="flex items-center gap-3 border-b moh-border p-4 hover:bg-black/5 dark:hover:bg-white/5">
              <AppIconGlyph name="badgeVerified" :size="24" class="text-[var(--moh-verified)]" />
              <span class="flex-1"><strong class="block">Verification requests</strong><span class="text-sm moh-text-muted">Members waiting to arrange a video call</span></span>
              <strong class="text-2xl tabular-nums">{{ pendingVerifications }}</strong>
            </NuxtLink>
            <AdminAssistantWorkspace />
          </template>
          <template v-else>
            <NuxtPage />
          </template>
        </main>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['admin'],
})

const route = useRoute()
const { pending: pendingVerifications } = useAdminVerificationCount()

interface AdminNavItem {
  key: string
  to: string
  icon: string
  label: string
  description: string
}

interface AdminSection {
  title: string
  items: AdminNavItem[]
}

const { data: capabilities } = await useAdminCapabilities()
const adminSections = computed<AdminSection[]>(() => {
  const sections = new Map<string, AdminNavItem[]>()
  for (const item of capabilities.value ?? []) {
    if (!item.path) continue
    const rows = sections.get(item.section) ?? []
    rows.push({ key: item.id, to: item.path, icon: item.icon, label: item.title, description: item.summary })
    sections.set(item.section, rows)
  }
  return [...sections].map(([title, items]) => ({ title, items }))
})

const isFullWidthRoute = computed(() => {
  const p = route.path
  return /^\/admin\/users\/[^/]+/.test(p) && p !== '/admin/users'
})

function isActiveArea(item: AdminNavItem): boolean {
  const p = route.path
  if (item.key === 'media-review') return p === item.to || p.startsWith('/admin/media-review/')
  if (item.key === 'users') return p === item.to || p.startsWith('/admin/users/')
  if (item.key === 'announcements') return p === item.to || p.startsWith('/admin/announcements/')
  if (item.key === 'newsletters') return p === item.to || p.startsWith('/admin/newsletters/')
  return p === item.to
}

function sidebarRowClass(item: AdminNavItem): string[] {
  return [
    'block px-4 py-3 transition-colors',
    isActiveArea(item) ? 'moh-pane-row-active' : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
  ]
}
</script>
