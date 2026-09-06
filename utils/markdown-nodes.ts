import { h, type VNodeChild } from 'vue'
import { marked, type Token, type Tokens } from 'marked'

/** Markdown is rendered as Vue text nodes, never HTML or executable MDC components. */
export function safeMarkdownHref(raw: string): string | null {
  if ([...raw].some(char => char.charCodeAt(0) <= 32 || char === '\\')) return null
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  if (raw.startsWith('#')) return raw
  try { const url = new URL(raw); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

export function markdownNodes(text: string): VNodeChild[] {
  const render = (tokens: Token[], depth = 0): VNodeChild[] => {
    if (depth > 20) return [tokens.map(token => token.raw).join('')]
    const children = (token: { tokens?: Token[]; text?: string }) => token.tokens ? render(token.tokens, depth + 1) : token.text ?? ''
    return tokens.map(token => {
      switch (token.type) {
        case 'space': return ''
        case 'paragraph': return h('p', children(token as Tokens.Paragraph))
        case 'text': return children(token as Tokens.Text)
        case 'strong': return h('strong', children(token as Tokens.Strong))
        case 'em': return h('em', children(token as Tokens.Em))
        case 'del': return h('del', children(token as Tokens.Del))
        case 'heading': return h(`h${Math.min(4, (token as Tokens.Heading).depth + 1)}`, children(token as Tokens.Heading))
        case 'blockquote': return h('blockquote', children(token as Tokens.Blockquote))
        case 'code': return h('pre', [h('code', (token as Tokens.Code).text)])
        case 'codespan': return h('code', (token as Tokens.Codespan).text)
        case 'br': return h('br')
        case 'hr': return h('hr')
        case 'link': {
          const link = token as Tokens.Link
          const href = safeMarkdownHref(link.href)
          return href ? h('a', { href, rel: 'noopener noreferrer', ...(href.startsWith('http') ? { target: '_blank' } : {}) }, children(link)) : children(link)
        }
        case 'list': {
          const list = token as Tokens.List
          return h(list.ordered ? 'ol' : 'ul', list.ordered ? { start: list.start } : {}, list.items.map(item => h('li', [item.task ? (item.checked ? '☑ ' : '☐ ') : '', ...render(item.tokens, depth + 1)])))
        }
        case 'table': {
          const table = token as Tokens.Table
          const cell = (value: Tokens.TableCell, tag: string) => h(tag, render(value.tokens, depth + 1))
          return h('div', { class: 'markdown-table' }, [h('table', [h('thead', [h('tr', table.header.map(value => cell(value, 'th')))]), h('tbody', table.rows.map(row => h('tr', row.map(value => cell(value, 'td')))))])])
        }
        case 'image': return (token as Tokens.Image).text
        // Raw HTML stays visible text; no script, event attributes, embeds, or remote image loads.
        default: return token.raw
      }
    })
  }
  return render(marked.lexer(text.slice(0, 100000), { gfm: true }))
}
