/** Device preference shared by all avatar instances; cookie also keeps SSR hydration stable. */
export function useAvatarAnimation() {
  return useCookie<boolean>('moh-animate-avatars', { default: () => true, maxAge: 31536000, sameSite: 'lax' })
}
