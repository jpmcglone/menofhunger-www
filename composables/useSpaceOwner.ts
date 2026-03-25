import type { Space } from '~/types/api'

export function useSpaceOwner() {
  const { apiFetchData } = useApiClient()

  async function createSpace(data: { title: string; description?: string }): Promise<Space | null> {
    try {
      return await apiFetchData<Space>('/spaces', {
        method: 'POST',
        body: data,
      })
    } catch {
      return null
    }
  }

  async function updateSpace(id: string, data: { title?: string; description?: string | null }): Promise<Space | null> {
    try {
      return await apiFetchData<Space>(`/spaces/${id}`, {
        method: 'PATCH',
        body: data,
      })
    } catch {
      return null
    }
  }

  async function activateSpace(id: string): Promise<Space | null> {
    try {
      return await apiFetchData<Space>(`/spaces/${id}/activate`, { method: 'POST' })
    } catch {
      return null
    }
  }

  async function deactivateSpace(id: string): Promise<Space | null> {
    try {
      return await apiFetchData<Space>(`/spaces/${id}/deactivate`, { method: 'POST' })
    } catch {
      return null
    }
  }

  async function setMode(id: string, data: { mode: string; watchPartyUrl?: string | null; radioStreamUrl?: string | null }): Promise<Space | null> {
    try {
      return await apiFetchData<Space>(`/spaces/${id}/mode`, {
        method: 'PATCH',
        body: data,
      })
    } catch {
      return null
    }
  }

  async function deleteSpace(id: string): Promise<boolean> {
    try {
      await apiFetchData(`/spaces/${id}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  }

  async function getMySpace(): Promise<Space | null> {
    const { user } = useAuth()
    if (!user.value?.username) return null
    try {
      return await apiFetchData<Space>(`/spaces/by-username/${encodeURIComponent(user.value.username)}`, { method: 'GET' })
    } catch {
      return null
    }
  }

  return {
    createSpace,
    updateSpace,
    activateSpace,
    deactivateSpace,
    setMode,
    deleteSpace,
    getMySpace,
  }
}
