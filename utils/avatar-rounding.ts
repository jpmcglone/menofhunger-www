export const ORG_AVATAR_ROUND_CLASS = 'rounded-[16%]'
/** Half of org squircle radius — proportional rounded square for group avatars. */
export const GROUP_AVATAR_ROUND_CLASS = 'rounded-[8%]'
/**
 * Crew avatars sit between an org squircle and a circle — a bit more rounded
 * than orgs so the Crew identity reads as distinct at a glance, but still
 * clearly a square (never a circle, which is reserved for individual users).
 * Expressed as a percentage of the avatar's width so the corner stays
 * proportional at every size (sidebar nav, chat row, members list, header).
 */
export const CREW_AVATAR_ROUND_CLASS = 'rounded-[24%]'
export const USER_AVATAR_ROUND_CLASS = 'rounded-full'

export function avatarRoundClass(isOrganization: boolean): string {
  return isOrganization ? ORG_AVATAR_ROUND_CLASS : USER_AVATAR_ROUND_CLASS
}

export function groupAvatarRoundClass(): string {
  return GROUP_AVATAR_ROUND_CLASS
}

export function crewAvatarRoundClass(): string {
  return CREW_AVATAR_ROUND_CLASS
}

