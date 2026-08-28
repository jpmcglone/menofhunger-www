import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('org avatar rounding', () => {
  it('keeps edit, crop, and admin avatar chrome on avatarRoundClass', () => {
    const edit = readFromRepo('components/app/profile/EditProfileDialog.vue')
    expect(edit).toMatch(/avatarRoundClass/)
    expect(edit).toMatch(/:is-organization="isOrganization"/)
    expect(edit).not.toMatch(/h-28 w-28 overflow-hidden rounded-full/)

    const crop = readFromRepo('components/app/profile/edit/AvatarCropDialog.vue')
    expect(crop).toMatch(/avatarRoundClass\(true\)/)
    expect(crop).toMatch(/isOrganization\?: boolean/)
    expect(crop).not.toMatch(/isGroupVariant\.value \? groupAvatarRoundClass\(\) : 'rounded-full'/)

    const admin = readFromRepo('pages/admin/users/[username]/index.vue')
    expect(admin).toMatch(/avatarRoundClass/)
    expect(admin).not.toMatch(/ring-4 ring-white dark:ring-black rounded-full/)
  })
})
