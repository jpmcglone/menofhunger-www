import { putShareInbox } from '../utils/share-inbox'

const MAX_FILES = 4
const MAX_BYTES = 8 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const fields = { title: '', text: '', url: '' }
  const files: Array<{ name: string; type: string; data: string }> = []

  for (const part of form ?? []) {
    const name = (part.name ?? '').toLowerCase()
    if (part.filename) {
      if (files.length >= MAX_FILES) continue
      if (!part.data?.length || part.data.length > MAX_BYTES) continue
      const type = (part.type || 'application/octet-stream').toLowerCase()
      if (!type.startsWith('image/')) continue
      files.push({
        name: part.filename,
        type,
        data: part.data.toString('base64'),
      })
      continue
    }
    const value = part.data?.toString('utf8') ?? ''
    if (name === 'title') fields.title = value
    if (name === 'text') fields.text = value
    if (name === 'url') fields.url = value
  }

  const query = new URLSearchParams()
  if (fields.title.trim()) query.set('title', fields.title.trim())
  if (fields.text.trim()) query.set('text', fields.text.trim())
  if (fields.url.trim()) query.set('url', fields.url.trim())
  if (files.length) {
    query.set('inbox', putShareInbox({
      title: fields.title.trim() || undefined,
      text: fields.text.trim() || undefined,
      url: fields.url.trim() || undefined,
      files,
    }))
  }

  const suffix = query.toString()
  return sendRedirect(event, suffix ? `/share?${suffix}` : '/share', 303)
})
