import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CrosspostDestinations from '../components/app/post/CrosspostDestinations.vue'
import { crosspostOptions } from '../utils/crosspost'
import type { CrosspostDraft } from '../utils/crosspost'

const draft: CrosspostDraft = { visibility: 'public', body: 'hello', mediaCount: 0, mediaAllUploadedImages: true, hasPoll: false, isReply: false, isQuote: false, isCheckin: false, scheduled: true }
const stubs = { Icon: true, Menu: true, NuxtLink: true, ToggleSwitch: { props: ['modelValue', 'disabled'], emits: ['update:modelValue'], template: '<button type="button" role="switch" :aria-checked="modelValue" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)" />' } }

describe('scheduled crosspost destinations', () => {
  it('offers X native-only and Pickax link or native for a scheduled public post', () => {
    expect(crosspostOptions(draft, 'x').modes).toEqual(['native'])
    expect(crosspostOptions(draft, 'pickax').modes).toEqual(['link', 'native'])
  })

  it('shows enabled Also post toggles that say Men of Hunger sends at the scheduled time, and emits the choice', async () => {
    const wrapper = mount(CrosspostDestinations, {
      props: { scheduled: true, destinations: [{ id: 'pickax', modes: ['link', 'native'] }, { id: 'x', modes: ['native'] }] },
      global: { stubs },
    })
    const text = wrapper.text()
    expect(text).toContain('Also post to Pickax')
    expect(text).toContain('Men of Hunger sends it to Pickax at the scheduled time.')
    expect(text).toContain('Also post to X')
    expect(text).toContain('Men of Hunger posts it to X at the scheduled time.')
    const toggles = wrapper.findAll('[role="switch"]')
    expect(toggles).toHaveLength(2)
    expect(toggles.every(toggle => !toggle.attributes('disabled'))).toBe(true)
    await toggles[0]!.trigger('click')
    await toggles[1]!.trigger('click')
    const last = wrapper.emitted('change')!.at(-1)![0]
    expect(last).toEqual({ pickax: 'native', x: 'native' })
  })
})
