import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { markdownNodes, safeMarkdownHref } from '../utils/markdown-nodes'

const render = (text: string) => renderToString(createSSRApp({ render: () => h('div', markdownNodes(text)) }))
describe('MARV Markdown', () => {
  it('renders the reported bold answer, paragraphs, lists, and tables', async () => {
    const html = await render('**Growth:** 6 signups.\n\n- First\n- Second\n\n| Metric | Value |\n| --- | --- |\n| DAU | 11 |')
    expect(html).toContain('<strong>Growth:</strong>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>11</td>')
  })
  it('keeps generated HTML inert and rejects unsafe links and remote images', async () => {
    const html = await render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n![tracking](https://example.com/pixel)')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('&lt;script&gt;')
  })
  it('preserves code literally and allows safe links', async () => {
    const html = await render('`**literal**` [Member](/u/john) [Docs](https://example.com)')
    expect(html).toContain('<code>**literal**</code>')
    expect(html).toContain('href="/u/john"')
    expect(html).toContain('rel="noopener noreferrer"')
    for (const url of ['//evil.test', '/\\evil.test', 'data:text/html,test', 'java\nscript:alert(1)']) expect(safeMarkdownHref(url)).toBeNull()
  })
})
