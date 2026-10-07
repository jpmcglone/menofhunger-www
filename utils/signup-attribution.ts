export const SIGNUP_ATTRIBUTION_STORAGE_KEY = 'moh.signupAttribution.v1'
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type SignupAttribution = {
  src?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  landingPath?: string
  referrerHost?: string
}

export type StoredSignupAttribution = SignupAttribution & { capturedAt: number }

function first(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? '').trim().slice(0, 120)
}

export function referrerHostFrom(referrer: string, ownHost: string): string {
  if (!referrer) return ''
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    return host && host !== ownHost.toLowerCase() ? host : ''
  } catch {
    return ''
  }
}

/** Builds attribution from the landing URL; returns null when the visit carries no signal. */
export function readAttributionFromVisit(input: {
  query: Record<string, unknown>
  path: string
  referrer: string
  ownHost: string
}): SignupAttribution | null {
  const attribution: SignupAttribution = {
    src: first(input.query.src) || undefined,
    utmSource: first(input.query.utm_source) || undefined,
    utmMedium: first(input.query.utm_medium) || undefined,
    utmCampaign: first(input.query.utm_campaign) || undefined,
    landingPath: input.path.slice(0, 200) || undefined,
    referrerHost: referrerHostFrom(input.referrer, input.ownHost) || undefined,
  }
  const hasCampaignSignal = Boolean(attribution.src || attribution.utmSource || attribution.utmMedium || attribution.utmCampaign)
  if (!hasCampaignSignal && !attribution.referrerHost && !first(input.query.ref)) return null
  return attribution
}

export function isAttributionFresh(stored: StoredSignupAttribution | null, now: number): boolean {
  return Boolean(stored && Number.isFinite(stored.capturedAt) && now - stored.capturedAt < ATTRIBUTION_TTL_MS)
}

export function parseStoredAttribution(raw: string | null): StoredSignupAttribution | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredSignupAttribution
    return parsed && typeof parsed === 'object' && typeof parsed.capturedAt === 'number' ? parsed : null
  } catch {
    return null
  }
}
