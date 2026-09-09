/** Compose the existing-composer body from an OS share (title + text + URL). */
export function composeShareText(input: {
  title?: string | null
  text?: string | null
  url?: string | null
}): string {
  const title = (input.title ?? '').trim()
  const text = (input.text ?? '').trim()
  const url = (input.url ?? '').trim()
  const parts: string[] = []
  if (title && title !== text && title !== url) parts.push(title)
  if (text) parts.push(text)
  if (url && !title.includes(url) && !text.includes(url)) parts.push(url)
  return parts.join('\n')
}
