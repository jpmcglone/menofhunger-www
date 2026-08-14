import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALLOWED_REACTIONS } from '../utils/reactions'
import { ARTICLE_REACTIONS } from '../utils/article-reactions'

describe('shared default reactions', () => {
  it('includes strong and is the article list', () => {
    expect(ALLOWED_REACTIONS.some((r) => r.id === 'strong' && r.emoji === '💪')).toBe(true)
    expect(ARTICLE_REACTIONS).toBe(ALLOWED_REACTIONS)
  })

  it('keeps the API list as the source of truth', () => {
    const api = readFileSync(
      resolve(process.cwd(), '../menofhunger-api/src/common/constants/reactions.ts'),
      'utf8',
    )
    expect(api).toMatch(/id: 'strong'/)
    expect(api).toMatch(/emoji: '💪'/)
    const www = readFileSync(resolve(process.cwd(), 'utils/reactions.ts'), 'utf8')
    const articles = readFileSync(resolve(process.cwd(), 'utils/article-reactions.ts'), 'utf8')
    expect(www).toMatch(/id: 'strong'/)
    expect(articles).toMatch(/from '\.\/reactions'/)
  })
})
