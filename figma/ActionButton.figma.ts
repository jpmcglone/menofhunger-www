// url=https://www.figma.com/file/YnuRSJB7p90n9jEY4mb4RN/Men-of-Hunger?node-id=59-956
// source=components/app/ActionButton.vue
// component=ActionButton
import figma from 'figma'

const instance = figma.selectedInstance
const label = instance.getString('Label')
const kind = instance.getEnum('Kind', {
  Primary: 'primary',
  Secondary: 'secondary',
  Brand: 'brand',
  Danger: 'danger',
  Outline: 'outline',
  Ghost: 'ghost',
})
const state = instance.getEnum('State', {
  Default: 'default',
  Disabled: 'disabled',
  Loading: 'loading',
  Pressed: 'pressed',
  Focused: 'focused',
})

export default {
  example: figma.code`<ActionButton label="${label}" kind="${kind}"${state === 'disabled' ? ' disabled' : ''}${state === 'loading' ? ' loading' : ''} />`,
  imports: [],
  id: 'moh-action-button',
  metadata: { nestable: true },
}
