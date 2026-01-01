export type WallPost = {
  id: string
  body: string
  createdAt: number
}

const STORAGE_KEY = 'moh.wall.posts.v1'

export function useWallPosts() {
  const posts = useState<WallPost[]>('wall-posts', () => [
    {
      id: 'welcome',
      body: 'Welcome. This is your wall — posts are shown in simple chronological order.',
      createdAt: Date.now()
    }
  ])

  // Client-side persistence (keeps SSR safe and avoids hydration issues).
  onMounted(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as WallPost[]
      if (Array.isArray(parsed)) {
        posts.value = parsed
      }
    } catch {
      // ignore
    }
  })

  watch(
    posts,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // ignore
      }
    },
    { deep: true }
  )

  const addPost = (body: string) => {
    const trimmed = body.trim()
    if (!trimmed) return
    posts.value = [
      {
        id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        body: trimmed,
        createdAt: Date.now()
      },
      ...posts.value
    ]
  }

  return { posts, addPost }
}

