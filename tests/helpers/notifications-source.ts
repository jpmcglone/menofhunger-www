import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** useNotifications facade plus its split parts, for source-level assertions. */
export function readNotificationsSource(root = resolve(__dirname, '../..')): string {
  const dir = resolve(root, 'composables/notifications')
  const parts = readdirSync(dir).filter((f) => f.endsWith('.ts')).sort().map((f) => readFileSync(resolve(dir, f), 'utf8'))
  return [readFileSync(resolve(root, 'composables/useNotifications.ts'), 'utf8'), ...parts].join('\n')
}
