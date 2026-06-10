/**
 * Shared Tiptap extension set used by:
 *  - pages/a/[id].vue (client-side, imported lazily via dynamic import())
 *  - server/utils/article-feed.ts (server-side, imported statically for RSS)
 *
 * Keep in sync with the article editor's extension set in ArticleEditorBody.vue.
 */
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import type { AnyExtension } from '@tiptap/core'
import { Callout } from './tiptap-callout'

export function buildTiptapExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: true },
      underline: {},
    }),
    Image,
    Youtube,
    Callout,
  ]
}

/** Render a Tiptap JSON body string to HTML. Returns empty string on failure or empty body. */
export function renderTiptapBodyToHtml(bodyJson: string): string {
  if (!bodyJson || bodyJson === '{}') return ''
  try {
    return generateHTML(JSON.parse(bodyJson), buildTiptapExtensions())
  } catch {
    return ''
  }
}
