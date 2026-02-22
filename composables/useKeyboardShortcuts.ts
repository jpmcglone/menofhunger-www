export type ShortcutSection = 'Navigation' | 'Feed' | 'Media' | 'Help'

export type ShortcutDef = {
  /** Display keys, e.g. ['G', 'H'] for a two-key sequence, ['←', '→'] for alternatives. */
  keys: string[]
  label: string
  section: ShortcutSection
  /** True for shortcuts handled elsewhere (lightbox, space audio) — shown in modal but not registered here. */
  displayOnly?: boolean
}

export const ALL_SHORTCUTS: ShortcutDef[] = [
  // Navigation — primary nav items first, then secondary
  { keys: ['/'], label: 'Focus search', section: 'Navigation' },
  { keys: ['N'], label: 'New post', section: 'Navigation' },
  { keys: ['G', 'H'], label: 'Go to Home', section: 'Navigation' },
  { keys: ['G', 'E'], label: 'Go to Explore', section: 'Navigation' },
  { keys: ['G', 'N'], label: 'Go to Notifications', section: 'Navigation' },
  { keys: ['G', 'C'], label: 'Go to Chat', section: 'Navigation' },
  { keys: ['G', 'S'], label: 'Go to Spaces', section: 'Navigation' },
  { keys: ['G', 'G'], label: 'Go to Groups', section: 'Navigation' },
  { keys: ['G', 'B'], label: 'Go to Bookmarks', section: 'Navigation' },
  { keys: ['G', 'P'], label: 'Go to Profile', section: 'Navigation' },
  { keys: ['G', 'M'], label: 'Go to Only Me', section: 'Navigation' },
  { keys: ['G', 'R'], label: 'Go to Radio', section: 'Navigation' },
  { keys: ['<'], label: 'Go to Settings', section: 'Navigation' },
  // Feed
  { keys: ['J'], label: 'Next post', section: 'Feed' },
  { keys: ['K'], label: 'Previous post', section: 'Feed' },
  { keys: ['R'], label: 'Reply to focused post', section: 'Feed' },
  // Media
  { keys: ['←', '→'], label: 'Navigate media', section: 'Media', displayOnly: true },
  { keys: ['Esc'], label: 'Close / dismiss', section: 'Media', displayOnly: true },
  { keys: ['Space'], label: 'Play / pause radio', section: 'Media', displayOnly: true },
  // Help
  { keys: ['?'], label: 'Show keyboard shortcuts', section: 'Help' },
]

export function useKeyboardShortcuts() {
  const showModal = useState<boolean>('moh.shortcuts.showModal', () => false)

  function openShortcutsModal() {
    showModal.value = true
  }

  function closeShortcutsModal() {
    showModal.value = false
  }

  function toggleShortcutsModal() {
    showModal.value = !showModal.value
  }

  return {
    showModal,
    shortcuts: ALL_SHORTCUTS,
    openShortcutsModal,
    closeShortcutsModal,
    toggleShortcutsModal,
  }
}
