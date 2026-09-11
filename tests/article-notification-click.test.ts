import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('article notification click-through', () => {
  it('routes article replies and new articles to /a/:id with a comment hash', () => {
    const source = readFile('composables/useNotifications.ts')
    const rowHrefStart = source.indexOf('function rowHref')
    expect(rowHrefStart).toBeGreaterThan(0)
    const rowHref = source.slice(rowHrefStart)
    expect(rowHref).toContain("n.kind === 'followed_article'")
    expect(rowHref).toContain('#comment-${n.subjectArticleCommentId}')
    expect(rowHref).toContain('/a/${encodeURIComponent(n.subjectArticleId)}')
    const articleIdx = rowHref.indexOf('n.subjectArticleId')
    const postIdx = rowHref.lastIndexOf(
      'if (n.subjectPostId) return `/p/${encodeURIComponent(n.subjectPostId)}`',
    )
    expect(articleIdx).toBeGreaterThan(0)
    expect(articleIdx).toBeLessThan(postIdx)
  })

  it('keeps article comment hashes when appending push analytics params', () => {
    const source = readFile('public/sw-push.js')
    expect(source).toContain("parsed.searchParams.set('from', 'push')")
    expect(source).not.toContain('url + sep + extra')
  })

  it('preserves the article comment hash when cleaning push query params', () => {
    const source = readFile('plugins/push-click-analytics.client.ts')
    expect(source).toContain('const hash = route.hash')
    expect(source).toContain('query: cleanQuery, hash')
  })

  it('claims native article list and reader paths, not the web writer', () => {
    const aasa = readFile('public/.well-known/apple-app-site-association')
    expect(aasa).toContain('"/a/*"')
    expect(aasa).toContain('"/articles"')
    expect(aasa).not.toContain('"/articles/*"')
  })

  it('reads a comment id from the hash or a comment query param', () => {
    const source = readFile('pages/a/[id].vue')
    expect(source).toContain('function commentIdFromRoute')
    expect(source).toContain('extractCommentIdFromHash(route.hash)')
    expect(source).toContain('route.query.comment')
    const comments = readFile('composables/useArticleComments.ts')
    expect(comments).toContain('async function ensureComment')
    expect(comments).toContain('/articles/${articleId.value}/comments/${commentId}')
  })
})
