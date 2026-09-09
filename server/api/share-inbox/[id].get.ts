import { takeShareInbox } from '../../utils/share-inbox'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')?.trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing inbox id' })
  }
  const entry = takeShareInbox(id)
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Share inbox expired' })
  }
  return {
    title: entry.title ?? null,
    text: entry.text ?? null,
    url: entry.url ?? null,
    files: entry.files,
  }
})
