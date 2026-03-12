<template>
  <Dialog
    v-model:visible="open"
    modal
    :header="title"
    :draggable="false"
    class="w-[min(30rem,calc(100vw-2rem))]"
  >
    <div class="text-sm moh-text-muted">
      {{ message }}
    </div>

    <template #footer>
      <Button label="Not now" severity="secondary" text @click="hide" />
      <Button
        :label="primaryLabel"
        severity="secondary"
        rounded
        @click="onPrimary"
      >
        <template v-if="primaryIconName" #icon>
          <Icon :name="primaryIconName" aria-hidden="true" />
        </template>
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const { open, kind, action, hide } = useAuthActionModal()

const title = computed(() => {
  if (kind.value === 'login') return 'Log in to continue'
  if (kind.value === 'premium') {
    if (action.value === 'article-boost') return 'Premium required to boost'
    if (action.value === 'article-react') return 'Premium required to react'
    if (action.value === 'article-comment') return 'Premium required to comment'
    return 'Premium required'
  }
  if (kind.value === 'verify') {
    if (action.value === 'useAsDraft') return 'Verify to use drafts'
    if (action.value === 'poll') return 'Verify to vote'
    if (action.value === 'article-boost') return 'Verify to boost'
    if (action.value === 'article-react') return 'Verify to react'
    if (action.value === 'article-comment') return 'Verify to comment'
    return 'Verify to reply'
  }
  if (kind.value === 'setUsername') return 'Set a username to boost'
  return 'Continue'
})

const message = computed(() => {
  if (kind.value === 'login') {
    if (action.value === 'post') return 'You need to log in to post.'
    if (action.value === 'comment' || action.value === 'article-comment') return 'You need to log in to comment.'
    if (action.value === 'bookmark') return 'You need to log in to save posts.'
    if (action.value === 'poll') return 'You need to log in to vote on polls.'
    if (action.value === 'article-boost') return 'You need to log in to boost this article.'
    if (action.value === 'article-react') return 'You need to log in to react to this article.'
    return 'You need to log in to boost posts.'
  }
  if (kind.value === 'premium') {
    if (action.value === 'article-boost') return 'Boosting this article is for premium members. Upgrade to interact with premium content.'
    if (action.value === 'article-react') return 'Reacting to this article is for premium members. Upgrade to interact with premium content.'
    if (action.value === 'article-comment') return 'Commenting on this article is for premium members. Upgrade to interact with premium content.'
    return 'This content is for premium members. Upgrade to access.'
  }
  if (kind.value === 'verify') {
    if (action.value === 'useAsDraft') {
      return 'Using "Use as draft" is available once your account is verified. Verify your account to continue.'
    }
    if (action.value === 'poll') {
      return 'Voting on polls is for verified members. Verify your account to vote.'
    }
    if (action.value === 'article-boost') return 'Boosting articles is for verified members. Verify your account to continue.'
    if (action.value === 'article-react') return 'Reacting to articles is for verified members. Verify your account to continue.'
    if (action.value === 'article-comment') return 'Commenting on articles is for verified members. Verify your account to continue.'
    return 'Replying is for verified members. Verify your account to reply.'
  }
  // setUsername
  return "Boosting is available once you've set your username."
})

const primaryLabel = computed(() => {
  if (kind.value === 'login') return 'Log in'
  if (kind.value === 'premium') return 'Upgrade to Premium'
  if (kind.value === 'verify') return 'Go to settings'
  if (kind.value === 'setUsername') return 'Go to settings'
  return 'Continue'
})

const primaryIconName = computed(() => {
  if (kind.value === 'login') return 'tabler:arrow-right'
  if (kind.value === 'premium') return 'tabler:star'
  if (kind.value === 'verify') return 'tabler:settings'
  if (kind.value === 'setUsername') return 'tabler:settings'
  return undefined
})

async function onPrimary() {
  hide()
  if (kind.value === 'login') {
    await navigateTo('/login')
    return
  }
  if (kind.value === 'premium') {
    await navigateTo('/settings/subscription')
    return
  }
  // verify / setUsername both live in settings for now.
  await navigateTo('/settings')
}
</script>
