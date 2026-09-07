export type AvatarVideoEdit = {
  file: File
  poster: Blob
  selection: { startSeconds: number; durationSeconds: number; crop: { x: number; y: number; width: number; height: number } }
}
