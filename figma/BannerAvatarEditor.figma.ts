// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=980-85
// source=components/app/BannerAvatarEditor.vue
// component=AppBannerAvatarEditor
import figma from 'figma'

const instance = figma.selectedInstance
const variant = instance.getEnum('Variant', {
  User: 'user',
  Organization: 'organization',
  Group: 'group',
  Crew: 'crew',
})

export default {
  example: figma.code`<AppBannerAvatarEditor :editor="editor" variant="${variant}" />`,
  imports: [],
  id: 'banner-avatar-editor',
  metadata: { nestable: false },
}
