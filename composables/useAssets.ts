function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}

export function useAssets() {
  const config = useRuntimeConfig()
  const assetsBaseUrl = String(config.public.assetsBaseUrl || '').trim()

  function assetUrl(key: string | null | undefined): string | null {
    if (!key) return null
    if (!assetsBaseUrl) return null
    return joinUrl(assetsBaseUrl, key)
  }

  return { assetsBaseUrl, assetUrl }
}

