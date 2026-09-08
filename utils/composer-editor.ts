import StarterKit from '@tiptap/starter-kit'

// Drafts are editable text; pasted and auto-detected URLs must never navigate.
export const composerStarterKit = StarterKit.configure({
  link: false,
  heading: false,
  blockquote: false,
  codeBlock: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  horizontalRule: false,
  code: false,
  bold: false,
  italic: false,
  strike: false,
})
