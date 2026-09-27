declare module 'figma' {
  interface CodeSnippet {
    readonly __snippet: true
  }

  interface Instance {
    getString(name: string): string
    getBoolean(name: string, mapping?: { true: unknown; false: unknown }): unknown
    getEnum<T>(name: string, mapping: Record<string, T>): T
  }

  const figma: {
    selectedInstance: Instance
    code(strings: TemplateStringsArray, ...values: unknown[]): CodeSnippet
  }

  export default figma
}
