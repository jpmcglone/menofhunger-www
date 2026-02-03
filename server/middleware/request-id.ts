/**
 * Assign a request id to each request for tracing. Set on response and on context
 * so SSR code (e.g. useApiClient) can forward it to the API for log correlation.
 */
export default defineEventHandler((event) => {
  const incoming = getHeader(event, 'x-request-id')
  const id = (typeof incoming === 'string' ? incoming.trim() : '') || crypto.randomUUID()
  setResponseHeader(event, 'x-request-id', id)
  event.context.requestId = id
})
