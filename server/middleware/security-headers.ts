/**
 * Set safe security headers on all responses (HTML pages and static assets).
 * Applied by Nitro before the route handler runs.
 */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
})
