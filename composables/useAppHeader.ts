export type AppHeaderState =
  | null
  | {
      title: string
      icon?: string
      description?: string
      verifiedStatus?: 'none' | 'identity' | 'manual' | null
      premium?: boolean | null
      postCount?: number | null
    }

export function useAppHeader() {
  const header = useState<AppHeaderState>('app-header', () => null)
  return { header }
}

