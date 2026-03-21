export const ORG_AVATAR_ROUND_CLASS = 'rounded-[16%]'
/** Half of org squircle radius — proportional rounded square for group avatars. */
export const GROUP_AVATAR_ROUND_CLASS = 'rounded-[8%]'
export const USER_AVATAR_ROUND_CLASS = 'rounded-full'

export function avatarRoundClass(isOrganization: boolean): string {
  return isOrganization ? ORG_AVATAR_ROUND_CLASS : USER_AVATAR_ROUND_CLASS
}

export function groupAvatarRoundClass(): string {
  return GROUP_AVATAR_ROUND_CLASS
}

