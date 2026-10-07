import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** The call session facade plus its split parts, for source-level wiring assertions. */
export function readCallSessionSource(root = resolve(__dirname, '../..')): string {
  const dir = resolve(root, 'composables/calls/session')
  const parts = readdirSync(dir).filter((f) => f.endsWith('.ts')).sort().map((f) => readFileSync(resolve(dir, f), 'utf8'))
  return [readFileSync(resolve(root, 'composables/calls/useCallSession.ts'), 'utf8'), ...parts].join('\n')
}
