export type AvatarVideoEdit = {
  file: File
  poster: Blob
  selection: { startSeconds: number; durationSeconds: number; crop: { x: number; y: number; width: number; height: number } }
}

/** Admin uploads always address the selected profile, never the administrator’s own avatar. */
export function avatarVideoBasePath(targetUserId?: string | null): string {
  return targetUserId ? `/admin/users/${encodeURIComponent(targetUserId)}/uploads/avatar/video` : '/uploads/avatar/video'
}
