export type AuthAction = 'comment' | 'boost' | 'bookmark' | 'useAsDraft'
export type AuthActionModalKind = 'login' | 'verify' | 'setUsername'

export function useAuthActionModal() {
  const open = useState<boolean>('auth-action-modal-open', () => false)
  const kind = useState<AuthActionModalKind>('auth-action-modal-kind', () => 'login')
  const action = useState<AuthAction>('auth-action-modal-action', () => 'comment')

  function show(params: { kind: AuthActionModalKind; action: AuthAction }) {
    kind.value = params.kind
    action.value = params.action
    open.value = true
  }

  function hide() {
    open.value = false
  }

  return { open, kind, action, show, hide }
}

