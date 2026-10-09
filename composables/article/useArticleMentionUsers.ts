import type { Ref } from 'vue'
import type { ArticleComment, ArticleAuthor, FollowListUser } from '~/types/api'

/** Mention-autocomplete priority users for the article compose and reply boxes. */
export function useArticleMentionUsers(props: { author?: ArticleAuthor }, comments: Ref<ArticleComment[]>) {
  // ─── Mention priority users ──────────────────────────────────────────────────

  const EMPTY_RELATIONSHIP: FollowListUser['relationship'] = {
    viewerFollowsUser: false,
    userFollowsViewer: false,
    viewerPostNotificationsEnabled: false,
  }

  function authorToMentionUser(a: ArticleAuthor): FollowListUser {
    return {
      id: a.id,
      username: a.username,
      name: a.name,
      avatarUrl: a.avatarUrl, avatarVideo: a.avatarVideo,
      premium: a.premium,
      premiumPlus: a.premiumPlus,
      isOrganization: a.isOrganization,
      verifiedStatus: a.verifiedStatus,
      relationship: EMPTY_RELATIONSHIP,
    }
  }

  /**
   * Unique mention users collected from all comment + reply authors in the thread.
   * The array is ordered by first appearance (top-level comments first, then replies).
   */
  const threadMentionUsers = computed<FollowListUser[]>(() => {
    const seen = new Set<string>()
    const result: FollowListUser[] = []
    const articleAuthorId = props.author?.id

    function add(a: ArticleAuthor) {
      if (!a.id || seen.has(a.id) || a.id === articleAuthorId) return
      seen.add(a.id)
      result.push(authorToMentionUser(a))
    }

    for (const c of comments.value) {
      add(c.author)
      for (const r of c.replies ?? []) add(r.author)
    }
    return result
  })

  /** Priority users for the top-level compose box: article author first, then thread participants. */
  const composePriorityUsers = computed<FollowListUser[]>(() => {
    const list: FollowListUser[] = []
    if (props.author) list.push(authorToMentionUser(props.author))
    list.push(...threadMentionUsers.value)
    return list
  })

  /** Priority users for a reply box: reply target first, then author, then other thread participants. */
  function replyPriorityUsers(comment: ArticleComment): FollowListUser[] {
    const replyTargetId = comment.author.id
    const list: FollowListUser[] = [authorToMentionUser(comment.author)]
    if (props.author && props.author.id !== replyTargetId) list.push(authorToMentionUser(props.author))
    list.push(...threadMentionUsers.value.filter((u) => u.id !== replyTargetId))
    return list
  }

  return {
    composePriorityUsers,
    replyPriorityUsers,
  }
}
