import { androidAppLinks } from '../../utils/android-app-links'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return androidAppLinks(useRuntimeConfig(event).androidAppSha256Fingerprints)
})
