import type { ApiErrorEnvelope } from '~/types/api'

type MaybeFetchError = {
  data?: unknown
  message?: string
}

export function getApiErrorMessage(e: unknown): string | null {
  const maybe = e as MaybeFetchError | null | undefined
  const data = maybe?.data as ApiErrorEnvelope | undefined

  const first = data?.meta?.errors?.[0]
  if (first?.message) return first.message

  if (e instanceof Error) return e.message
  if (typeof maybe?.message === 'string') return maybe.message

  return null
}

