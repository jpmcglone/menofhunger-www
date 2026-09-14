import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SelectionDialog from '~/components/app/composer/SelectionDialog.vue'

describe('selection dialog dismissal', () => {
  it('provides a modal dialog and closes without selecting or changing a destination', async () => {
    const wrapper = await mountSuspended(SelectionDialog, {
      props: { modelValue: true, title: 'Post visibility', description: 'Who can see your post.' },
      attachTo: document.body,
    })
    try {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
      expect(dialog).not.toBeNull()
      expect(dialog.getAttribute('aria-modal')).toBe('true')
      dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click()
      await nextTick()
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    } finally { wrapper.unmount(); document.body.innerHTML = '' }
  })
})
