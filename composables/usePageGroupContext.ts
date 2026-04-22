/**
 * Page-level group context.
 *
 * Pages whose primary content belongs to a group (currently /p/:id when the post
 * lives in a community group) set this so the layout / nav can:
 *   - keep the "Groups" left-nav item active while the user is reading the post
 *   - render contextual chrome (e.g. a "back to {group}" strip)
 *
 * The page is responsible for clearing the value when its post no longer has a
 * group context (e.g. the route changes to a non-group post or the page unmounts).
 */
export type PageGroupContext = {
  id: string
  slug: string
  name: string
  avatarImageUrl: string | null
} | null

export function usePageGroupContext() {
  return useState<PageGroupContext>('page-group-context', () => null)
}
