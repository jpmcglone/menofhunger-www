import type { FollowListUser } from '~/types/api'

export interface StyledTextareaProps {
    modelValue: string
    placeholder?: string
    disabled?: boolean
    autoFocus?: boolean
    priorityUsers?: FollowListUser[] | null
    prioritySectionTitle?: string
    /** CSS color value for hashtag nodes (defaults to primary color). */
    hashtagColor?: string
    /**
     * Keyboard submit mode.
     * - 'enter' (default, DM): Enter sends; Shift/Alt/Ctrl-Enter inserts newline.
     * - 'cmd-enter' (post composer): Cmd/Ctrl-Enter sends; Enter and Shift-Enter insert newline.
     */
    submitTrigger?: 'enter' | 'cmd-enter'
  }

export interface StyledTextareaEmits {
  'update:modelValue': [value: string]
  send: []
  'media-files': [files: File[]]
}

/** Props inside `AppStyledTextarea` after `withDefaults` fills the defaulted keys. */
export type StyledTextareaResolvedProps = StyledTextareaProps & Required<Pick<StyledTextareaProps, 'placeholder' | 'disabled' | 'autoFocus' | 'priorityUsers' | 'hashtagColor' | 'submitTrigger'>>
