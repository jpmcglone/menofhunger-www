export const ORG_AVATAR_ROUND_CLASS = 'rounded-[16%]'
export const USER_AVATAR_ROUND_CLASS = 'rounded-full'

export function avatarRoundClass(isOrganization: boolean): string {
  return isOrganization ? ORG_AVATAR_ROUND_CLASS : USER_AVATAR_ROUND_CLASS
}

