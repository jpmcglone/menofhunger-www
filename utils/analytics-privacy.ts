/** Remove URL queries/fragments and free-text search from analytics, including initial person properties. */
export function sanitizeAnalyticsProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (/^(query|search_query|phone|phone_masked|email|body|message|\$initial_search_keyword|\$search_keyword)$/.test(key)) continue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAnalyticsProperties(value as Record<string, unknown>)
    } else if (typeof value === 'string' && /url|referrer|pathname/i.test(key)) {
      sanitized[key] = value.split(/[?#]/)[0]
    } else sanitized[key] = value
  }
  return sanitized
}
