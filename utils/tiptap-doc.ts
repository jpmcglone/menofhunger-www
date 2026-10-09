/** Structural view of a serialized Tiptap/ProseMirror document node. */
export type TiptapDocNode = {
  type?: string
  text?: string
  content?: TiptapDocNode[]
}
