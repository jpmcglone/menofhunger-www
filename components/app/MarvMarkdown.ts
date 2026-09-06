import { defineComponent, h } from 'vue'
import { markdownNodes } from '~/utils/markdown-nodes'

export default defineComponent({
  props: { text: { type: String, required: true } },
  setup: props => () => h('div', { class: 'marv-markdown min-w-0 break-words' }, markdownNodes(props.text)),
})
