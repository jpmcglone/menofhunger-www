import type { AdminAssistantTurnDto } from '~/types/api'

/** Sort a copy so realtime payloads retain their original order. Invalid dates go last. */
export function adminNewestAsks(turns: AdminAssistantTurnDto[]): AdminAssistantTurnDto[] {
  const timestamp = (value: string) => Date.parse(value) || 0
  return [...turns].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))
}

export function adminAskDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function adminSourceUrl(value: string | null): string | undefined {
  if (!value) return undefined
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}

export function adminAnswerPreview(answer: string | null): string {
  return (answer ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*#`_]/g, '').replace(/\s+/g, ' ').trim()
}

/** Render server-owned review snapshots as text; never execute rich text or HTML. */
export function adminReviewFields(raw: string): Array<{ label: string; value: string }> {
  let value: Record<string, unknown>
  try { value = JSON.parse(raw) } catch { return [{ label: 'Details', value: raw }] }
  const text = (entry: unknown): string => {
    if (entry == null) return 'None'
    if (typeof entry === 'boolean') return entry ? 'Yes' : 'No'
    if (Array.isArray(entry)) return entry.map(text).join('\n') || 'None'
    if (typeof entry === 'object') return Object.entries(entry).map(([key, val]) => `${label(key)}: ${text(val)}`).join('\n')
    return String(entry)
  }
  const label = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  const bodyText = (node: unknown): string => {
    if (!node || typeof node !== 'object') return ''
    const item = node as { text?: string; content?: unknown[]; type?: string }
    return item.text ?? (item.content?.map(bodyText).join(item.type === 'doc' ? '\n\n' : '') ?? '')
  }
  return Object.entries(value).map(([key, entry]) => {
    if (key === 'bodyJson' && typeof entry === 'string') {
      try { return { label: 'Body', value: bodyText(JSON.parse(entry)) } } catch { /* Display invalid draft text so it remains reviewable. */ }
    }
    return { label: label(key), value: text(entry) }
  })
}
