const STORAGE_KEY = 'moh.sessionIdentityPreview'

export type SessionIdentityPreview = {
  label: string
  name: string
  avatarUrl: string | null
  isOrganization: boolean
}

type IdentitySource = {
  name?: string | null
  username?: string | null
  avatarUrl?: string | null
  isOrganization?: boolean | null
}

export function sessionIdentityLabel(name?: string | null, username?: string | null): string {
  const trimmedName = name?.trim() ?? ''
  if (trimmedName) return trimmedName
  const trimmedUsername = username?.trim() ?? ''
  if (trimmedUsername) return trimmedUsername
  return 'your account'
}

export function rememberSessionIdentity(user: IdentitySource): void {
  if (!import.meta.client) return
  const label = sessionIdentityLabel(user.name, user.username)
  const trimmedName = user.name?.trim() ?? ''
  const preview: SessionIdentityPreview = {
    label,
    name: trimmedName || label,
    avatarUrl: user.avatarUrl?.trim() || null,
    isOrganization: user.isOrganization === true,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preview))
  } catch {
    // Private mode or a full store should not block sign-in.
  }
}

export function loadSessionIdentity(): SessionIdentityPreview | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SessionIdentityPreview>
    const label = typeof parsed.label === 'string' ? parsed.label.trim() : ''
    if (!label) return null
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
    return {
      label,
      name: name || label,
      avatarUrl: typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim() ? parsed.avatarUrl : null,
      isOrganization: parsed.isOrganization === true,
    }
  } catch {
    return null
  }
}

export function forgetSessionIdentity(): void {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures; the next sign-in rewrites the preview.
  }
}
