// Backwards-compatible shim (keep existing call sites stable while we rename).
export function useWallPosts() {
  return usePostsFeed()
}

