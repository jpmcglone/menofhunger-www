import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Pages and components whose template sections and script logic were split into
 * section components and composables. Source-level assertions read the whole surface.
 */
const SURFACE_PARTS: Record<string, string[]> = {
  'pages/admin/analytics.vue': [
    'components/app/admin/analytics',
    'composables/pages/admin/useAdminAnalyticsPage.ts',
    'composables/pages/admin/useAdminAnalyticsCards.ts',
    'composables/admin/useAnalyticsCharts.ts',
  ],
  'pages/a/[id].vue': ['components/app/article/page', 'composables/pages/article'],
  'components/app/content/PostRow.vue': ['composables/post-row/usePostRow.ts'],
  'components/app/profile/Header.vue': ['components/app/profile/header', 'composables/profile'],
  'pages/p/[id].vue': ['components/app/post/permalink', 'composables/pages/post'],
  'pages/u/[username].vue': ['components/app/profile/page', 'composables/pages/profile'],
}

function readParts(root: string, rel: string): string[] {
  const full = resolve(root, rel)
  if (!existsSync(full)) return []
  if (!statSync(full).isDirectory()) return [readFileSync(full, 'utf8')]
  return readdirSync(full).sort().flatMap((entry) => readParts(root, `${rel}/${entry}`))
}

/** The file itself followed by its extracted sections and composables (when it has any). */
export function readSurfaceSource(rel: string, root = resolve(__dirname, '../..')): string {
  return [rel, ...(SURFACE_PARTS[rel] ?? [])].flatMap((part) => readParts(root, part)).join('\n')
}
