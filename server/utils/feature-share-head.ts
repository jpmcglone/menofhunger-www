import { featurePageForPath } from '../../utils/feature-pages'
import { siteConfig } from '../../config/site'

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!))

/** Share metadata for client-only feature shells. Never fetches user data. */
export function featureShareHead(path: string, existingHead: string): string | null {
  // SSR pages already own their metadata, including content-specific covers and privacy gates.
  if (/property=["']og:image["']/.test(existingHead)) return null
  const feature = featurePageForPath(path)
  if (!feature) return null
  const title = `${feature.title} | ${siteConfig.name}`
  const image = new URL(feature.image, siteConfig.url).href
  const entries = [
    ['property', 'og:type', 'website'], ['property', 'og:site_name', siteConfig.name],
    ['property', 'og:title', title], ['property', 'og:description', feature.description],
    ['property', 'og:image', image], ['property', 'og:image:width', '1200'], ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', `${feature.title} — ${siteConfig.name}`],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', title],
    ['name', 'twitter:description', feature.description], ['name', 'twitter:image', image],
  ]
  return entries.map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escape(value!)}">`).join('')
}
