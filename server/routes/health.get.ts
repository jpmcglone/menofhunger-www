/**
 * Render readiness probe (`healthCheckPath: /health` in render.yaml).
 * Fast and dependency-free — do not call the API or a database here, or a
 * deploy will wait on those and can flip traffic too late (or never).
 */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store, no-cache, must-revalidate')
  return { ok: true, service: 'menofhunger-www' }
})

