import {
  SIGNUP_ATTRIBUTION_STORAGE_KEY,
  isAttributionFresh,
  parseStoredAttribution,
  readAttributionFromVisit,
  type SignupAttribution,
} from '~/utils/signup-attribution'

/** First-touch signup attribution: the first qualifying visit wins for 30 days. */
export function useSignupAttribution() {
  function read(): SignupAttribution | null {
    if (!import.meta.client) return null
    const stored = parseStoredAttribution(window.localStorage.getItem(SIGNUP_ATTRIBUTION_STORAGE_KEY))
    if (!isAttributionFresh(stored, Date.now())) return null
    const { capturedAt: _capturedAt, ...attribution } = stored!
    return attribution
  }

  function captureFromRoute(route = useRoute()) {
    if (!import.meta.client) return
    if (read()) return
    const visit = readAttributionFromVisit({
      query: route.query,
      path: route.path,
      referrer: document.referrer,
      ownHost: window.location.hostname,
    })
    if (!visit) return
    window.localStorage.setItem(SIGNUP_ATTRIBUTION_STORAGE_KEY, JSON.stringify({ ...visit, capturedAt: Date.now() }))
  }

  function clear() {
    if (import.meta.client) window.localStorage.removeItem(SIGNUP_ATTRIBUTION_STORAGE_KEY)
  }

  return { read, captureFromRoute, clear }
}
