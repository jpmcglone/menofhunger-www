import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('article preview hover', () => {
  it('brightens the thumbnail without zooming it', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'components/app/article/ShareCard.vue'),
      'utf8',
    )

    expect(source).toContain('group-hover:brightness-[1.08]')
    expect(source).toContain('transition-[filter]')
    expect(source).not.toContain('AppHoverZoom')
    expect(source).not.toContain('hover:border-gray-300')
    expect(source).not.toContain('dark:hover:border-zinc-600')
  })
})
