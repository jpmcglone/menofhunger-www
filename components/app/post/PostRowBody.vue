<template>
  <p class="mt-0.5 whitespace-pre-wrap break-words moh-text">
    <template v-for="(seg, idx) in displayBodySegments" :key="idx">
      <a
        v-if="seg.href"
        :href="seg.href"
        target="_blank"
        rel="noopener noreferrer"
        class="underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-500"
        @click.stop
      >
        {{ seg.text }}
      </a>
      <span v-else>{{ seg.text }}</span>
    </template>
  </p>
</template>

<script setup lang="ts">
import LinkifyIt from 'linkify-it'
import { siteConfig } from '~/config/site'
import { extractLinksFromText } from '~/utils/link-utils'

type TextSegment = { text: string; href?: string }

const props = defineProps<{
  body: string
  hasMedia: boolean
}>()

const linkify = new LinkifyIt()
const hasMedia = computed(() => Boolean(props.hasMedia))

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isLocalHost(host: string, expected: string) {
  const h = (host ?? '').trim().toLowerCase()
  const e = (expected ?? '').trim().toLowerCase()
  if (!h || !e) return false
  return h === e || h === `www.${e}`
}

function tryExtractLocalPostId(url: string): string | null {
  const raw = (url ?? '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

    const allowedHosts = new Set<string>()
    try {
      const fromCfg = new URL(siteConfig.url)
      if (fromCfg.hostname) allowedHosts.add(fromCfg.hostname.toLowerCase())
    } catch {
      // ignore
    }
    if (import.meta.client) {
      const h = window.location.hostname
      if (h) allowedHosts.add(h.toLowerCase())
    }

    const host = u.hostname.toLowerCase()
    const ok = Array.from(allowedHosts).some((a) => isLocalHost(host, a))
    if (!ok) return null

    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    if (parts[0] !== 'p') return null
    const id = (parts[1] ?? '').trim()
    return id || null
  } catch {
    return null
  }
}

const capturedLinks = computed(() => extractLinksFromText((props.body ?? '').toString()))

const embeddedPostLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && tryExtractLocalPostId(u)) return u
  }
  return null
})

const previewLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (!u) continue
    if (tryExtractLocalPostId(u)) continue
    return u
  }
  return null
})

const tailLinkToStrip = computed(() => {
  const xs = capturedLinks.value
  const last = xs.length ? xs[xs.length - 1] : null
  if (!last) return null
  if (embeddedPostLink.value && last === embeddedPostLink.value) return embeddedPostLink.value
  if (previewLink.value && last === previewLink.value && !hasMedia.value) return previewLink.value
  return null
})

const displayBody = computed(() => {
  let body = (props.body ?? '').toString()

  // If we are rendering an embedded local post preview, avoid showing the raw URL in the body
  // when it appears as its own standalone line. (Prevents "URL + preview" duplication.)
  const embedded = (embeddedPostLink.value ?? '').trim()
  if (embedded) {
    const reStandaloneLine = new RegExp(String.raw`(^|\n)[ \t]*${escapeRegExp(embedded)}[ \t]*(?=\n|$)`, 'g')
    if (reStandaloneLine.test(body)) {
      body = body
        .replace(reStandaloneLine, '$1')
        // tidy up whitespace after removing the line
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '')
    }
  }

  const last = (tailLinkToStrip.value ?? '').trim()
  if (!last) return body

  // If the last link is literally the last thing in the post (ignoring trailing whitespace),
  // omit it from the rendered body. We still render the preview/embed below.
  const re = new RegExp(String.raw`(?:\s*)${escapeRegExp(last)}\s*$`)
  if (!re.test(body)) return body
  return body.replace(re, '').replace(/\s+$/, '')
})

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ text: '' }]

  const matches = linkify.match(input) ?? []
  if (!matches.length) return [{ text: input }]

  const out: TextSegment[] = []
  let cursor = 0

  for (const m of matches) {
    const start = typeof (m as any).index === 'number' ? ((m as any).index as number) : -1
    const end = typeof (m as any).lastIndex === 'number' ? ((m as any).lastIndex as number) : -1
    if (start < 0 || end < 0 || end <= start) continue
    if (start > cursor) out.push({ text: input.slice(cursor, start) })

    const text = input.slice(start, end)
    const href = (m.url ?? '').trim()
    if (href && /^https?:\/\//i.test(href)) out.push({ text, href })
    else out.push({ text })

    cursor = end
  }

  if (cursor < input.length) out.push({ text: input.slice(cursor) })
  return out.length ? out : [{ text: input }]
})
</script>

