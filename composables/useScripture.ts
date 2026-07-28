/**
 * In-memory cache + in-flight dedupe for scripture verse fetches.
 * Mirrors the pattern from `utils/link-metadata.ts`.
 */

export type ScriptureVerse = {
  number: number
  text: string
}

export type ScriptureRef = {
  reference: string
  translation: string
  translationName: string
  verses: ScriptureVerse[]
  text: string
}

const cache = new Map<string, ScriptureRef | null>()
const inFlight = new Map<string, Promise<ScriptureRef | null>>()

export function useScripture() {
  async function fetchRef(reference: string): Promise<ScriptureRef | null> {
    const key = (reference ?? '').trim()
    if (!key) return null
    if (cache.has(key)) return cache.get(key) ?? null
    if (inFlight.has(key)) return await inFlight.get(key)!

    const job = (async () => {
      try {
        const { apiFetchData } = useApiClient()
        const data = await apiFetchData<ScriptureRef | null>('/scripture', {
          method: 'GET',
          query: { ref: key },
          mohDedupe: true,
        })
        cache.set(key, data ?? null)
        return data ?? null
      } catch {
        cache.set(key, null)
        return null
      }
    })()

    inFlight.set(key, job)
    try {
      return await job
    } finally {
      inFlight.delete(key)
    }
  }

  return { fetchRef }
}
