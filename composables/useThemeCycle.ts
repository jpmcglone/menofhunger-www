/** Shared by the global theme shortcut and the shortcuts modal. */
export function useThemeCycle() {
  const colorMode = useColorMode()

  function cycleTheme() {
    const preference = colorMode.preference || 'system'
    // Preserve the shortcut's existing order: system → dark → light → system.
    colorMode.preference = preference === 'system' ? 'dark' : preference === 'dark' ? 'light' : 'system'
  }

  return { cycleTheme }
}
