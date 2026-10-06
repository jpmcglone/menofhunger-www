export type AppHeaderState =
  | null
  | {
      title: string
      icon?: string
      /** Shows a group's avatar in place of the icon. */
      group?: { name: string; avatarUrl: string | null }
      description?: string
      verifiedStatus?: 'none' | 'identity' | 'manual' | null
      premium?: boolean | null
      premiumPlus?: boolean | null
      postCount?: number | null
    }

export function useAppHeader() {
  const header = useState<AppHeaderState>('app-header', () => null)
  return { header }
}

