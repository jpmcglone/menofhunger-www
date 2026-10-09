import { readFileSync } from 'node:fs'
import { compileStyle, parse } from '@vue/compiler-sfc'
import { afterEach, describe, expect, it } from 'vitest'

const source = readFileSync(`${process.cwd()}/components/app/content/PostComposer.vue`, 'utf8')
const style = parse(source).descriptor.styles.find(style => style.scoped)!
const compiled = compileStyle({ source: style.content, filename: 'PostComposer.vue', id: 'data-v-composer', scoped: true })
let host: HTMLElement | undefined
let stylesheet: HTMLStyleElement | undefined
afterEach(() => { host?.remove(); stylesheet?.remove() })

// Model the actual nested boundary: EditorArea's root carries the composer
// scope, while StyledTextarea and its editor carry only the child's scope.
function render(mode: string) {
  expect(compiled.errors).toEqual([])
  stylesheet = document.createElement('style')
  stylesheet.textContent = `.moh-styled-textarea-editor { padding: 10px 48px; font-size: 16px; }\n${compiled.code}`
  document.head.append(stylesheet)
  host = document.createElement('div')
  host.className = mode
  host.setAttribute('data-v-composer', '')
  host.innerHTML = '<div data-v-composer data-v-area><div class="moh-composer-styled-textarea" data-v-area data-v-textarea><div class="moh-styled-textarea-editor" data-v-textarea contenteditable="true">Say something</div></div></div>'
  document.body.append(host)
  return getComputedStyle(host.querySelector('.moh-styled-textarea-editor')!)
}
describe('composer editor spacing across the nested editor boundary', () => {
  for (const mode of ['moh-home-composer', 'moh-edit-composer', 'moh-prompt-composer']) {
    it(`removes inner horizontal padding in ${mode}`, () => {
      const editor = render(mode)
      expect(editor.paddingLeft).toBe('0px')
      expect(editor.paddingRight).toBe('0px')
      expect(editor.fontSize).toBe(mode === 'moh-prompt-composer' ? '18px' : '20px')
    })
  }
  it('keeps the shared textarea spacing outside a post composer', () => {
    render('moh-home-composer')
    const editor = document.createElement('div')
    editor.className = 'moh-styled-textarea-editor'
    document.body.append(editor)
    expect(getComputedStyle(editor).paddingLeft).toBe('48px')
    editor.remove()
  })
})
