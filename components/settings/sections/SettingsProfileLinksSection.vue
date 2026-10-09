<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-xl font-bold tracking-tight sm:text-2xl">Your links page</h2>
      <p class="mt-2 moh-text-muted">
        One public page for everything you want men to find. Share it anywhere. No sign-in needed to view.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <Button
          label="Share links page"
          rounded
          class="min-h-11"
          :disabled="!username"
          @click="shareOpen = true"
        >
          <template #icon>
            <Icon name="tabler:share" aria-hidden="true" />
          </template>
        </Button>
        <Button
          v-if="previewPath"
          as="NuxtLink"
          :to="previewPath"
          label="Preview as a visitor"
          severity="secondary"
          rounded
          class="min-h-11"
        >
          <template #icon>
            <Icon name="tabler:eye" aria-hidden="true" />
          </template>
        </Button>
      </div>
    </div>

    <AppInlineAlert v-if="loadError" severity="danger">
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ loadError }}</span>
        <button type="button" class="font-semibold underline underline-offset-2" @click="load()">Try again</button>
      </div>
    </AppInlineAlert>

    <p v-else-if="!loaded" class="text-sm moh-text-muted" aria-live="polite">Loading your links…</p>

    <template v-else>
      <section aria-labelledby="settings-links-connected">
        <h3 id="settings-links-connected" class="text-sm font-semibold">Connected accounts</h3>
        <p class="mt-1 text-sm moh-text-muted">Shown first on your page. Connect or disconnect in Integrations.</p>

        <ul v-if="connectedAccounts.length" class="mt-3 overflow-hidden rounded-2xl border moh-border moh-divide">
          <li
            v-for="account in connectedAccounts"
            :key="account.network"
            class="flex min-h-[56px] items-center gap-3 px-4 py-3"
          >
            <span class="flex size-8 shrink-0 items-center justify-center text-gray-900 dark:text-gray-50">
              <AppLinksBrandGlyph :icon="account.network" size-class="size-6" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px] font-semibold">@{{ account.handle }}</span>
              <span class="block truncate text-sm moh-text-muted">{{ accountCaption(account) }}</span>
            </span>
            <label
              v-if="account.supportsFollowerCount"
              class="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm"
            >
              <span class="moh-text-muted">Show follower count</span>
              <ToggleSwitch
                :model-value="account.showFollowerCount"
                :input-id="`show-follower-count-${account.network}`"
                @update:model-value="(v: boolean) => setShowFollowerCount(account.network, v)"
              />
            </label>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm moh-text-muted">
          Nothing connected yet.
          <NuxtLink to="/settings/integrations" class="font-semibold underline underline-offset-2">Connect X or Pickax</NuxtLink>
        </p>
        <p v-if="followerToggleError" class="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ followerToggleError }}</p>
      </section>

      <section aria-labelledby="settings-links-list">
        <div class="flex items-baseline justify-between gap-3">
          <h3 id="settings-links-list" class="text-sm font-semibold">Links</h3>
          <span class="text-xs tabular-nums moh-text-muted">{{ drafts.length }} of {{ maxLinks }}</span>
        </div>

        <div
          v-if="!canAddCustomLinks"
          class="mt-3 flex items-start gap-3 rounded-2xl border moh-border bg-[var(--moh-surface)] p-4"
        >
          <Icon name="tabler:lock" class="mt-0.5 size-5 shrink-0 moh-text-muted" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold">Verify to add custom links</p>
            <p class="mt-1 text-sm moh-text-muted">
              Custom links are for verified members. Your connected accounts always show.
            </p>
            <Button
              as="NuxtLink"
              to="/settings/verification"
              label="Get verified"
              rounded
              class="mt-3 min-h-11"
            />
          </div>
        </div>

        <p v-if="!drafts.length" class="mt-3 text-sm moh-text-muted">
          {{ canAddCustomLinks ? 'No links yet. Add your website, a podcast, a shop, anything worth a tap.' : 'No custom links.' }}
        </p>

        <TransitionGroup
          v-else
          name="moh-list"
          tag="ul"
          class="relative mt-3 overflow-hidden rounded-2xl border moh-border moh-divide"
        >
          <li
            v-for="(link, index) in drafts"
            :key="link.key"
            :class="[
              'bg-[var(--moh-bg)] transition-opacity',
              draggingKey === link.key ? 'opacity-40' : '',
              overKey === link.key && draggingKey && draggingKey !== link.key ? 'shadow-[inset_0_2px_0_0_var(--p-primary-color)]' : '',
            ]"
            :draggable="canAddCustomLinks && editingKey !== link.key"
            @dragstart="onDragStart(link.key, $event)"
            @dragover.prevent="onDragOver(link.key)"
            @drop.prevent="onDrop(link.key)"
            @dragend="onDragEnd"
          >
            <div v-if="editingKey === link.key" class="space-y-3 p-4">
              <AppFormField label="URL">
                <InputText
                  v-model="editUrl"
                  class="w-full"
                  placeholder="https://"
                  inputmode="url"
                  autocapitalize="off"
                  autocomplete="off"
                  maxlength="2000"
                  @keydown.enter.prevent="commitEdit(link.key)"
                />
              </AppFormField>
              <AppFormField label="Title" optional>
                <InputText
                  v-model="editTitle"
                  class="w-full"
                  placeholder="Defaults to the site name"
                  maxlength="80"
                  @keydown.enter.prevent="commitEdit(link.key)"
                />
              </AppFormField>
              <p v-if="editError" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ editError }}</p>
              <div class="flex items-center gap-2">
                <Button label="Done" rounded class="min-h-11" @click="commitEdit(link.key)" />
                <Button label="Cancel" severity="secondary" text rounded class="min-h-11" @click="cancelEdit" />
              </div>
            </div>

            <div v-else class="flex min-h-[56px] items-center gap-2 py-2 pl-2 pr-1">
              <span
                v-if="canAddCustomLinks"
                class="hidden size-8 shrink-0 cursor-grab items-center justify-center moh-text-muted sm:flex"
                aria-hidden="true"
              >
                <Icon name="tabler:grip-vertical" class="size-5" />
              </span>
              <span class="flex size-8 shrink-0 items-center justify-center text-gray-700 dark:text-gray-200">
                <AppLinksBrandGlyph :icon="link.icon" size-class="size-5" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-semibold">{{ link.title || link.host }}</span>
                <span class="block truncate text-sm moh-text-muted">{{ link.host || link.url }}</span>
                <span v-if="link.hiddenUntilVerified" class="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">
                  Hidden until you're verified
                </span>
              </span>
              <div v-if="canAddCustomLinks" class="flex shrink-0 items-center">
                <Button
                  text rounded severity="secondary"
                  class="!size-11"
                  :aria-label="`Move ${linkLabel(link)} up`"
                  :disabled="index === 0"
                  @click="moveBy(link.key, -1)"
                ><Icon name="tabler:chevron-up" class="text-xl" aria-hidden="true" /></Button>
                <Button
                  text rounded severity="secondary"
                  class="!size-11"
                  :aria-label="`Move ${linkLabel(link)} down`"
                  :disabled="index === drafts.length - 1"
                  @click="moveBy(link.key, 1)"
                ><Icon name="tabler:chevron-down" class="text-xl" aria-hidden="true" /></Button>
                <Button
                  text rounded severity="secondary"
                  class="!size-11"
                  :aria-label="`Edit ${linkLabel(link)}`"
                  @click="startEdit(link)"
                ><Icon name="tabler:pencil" class="text-xl" aria-hidden="true" /></Button>
                <Button
                  text rounded severity="danger"
                  class="!size-11"
                  :aria-label="`Remove ${linkLabel(link)}`"
                  @click="removeLink(link.key)"
                ><Icon name="tabler:trash" class="text-xl" aria-hidden="true" /></Button>
              </div>
            </div>
          </li>
        </TransitionGroup>

        <div v-if="canAddCustomLinks" class="mt-3">
          <div v-if="adding" class="space-y-3 rounded-2xl border moh-border p-4">
            <AppFormField label="URL">
              <InputText
                ref="addUrlInput"
                v-model="addUrl"
                class="w-full"
                placeholder="https://"
                inputmode="url"
                autocapitalize="off"
                autocomplete="off"
                maxlength="2000"
                @keydown.enter.prevent="commitAdd"
              />
            </AppFormField>
            <AppFormField label="Title" optional>
              <InputText
                v-model="addTitle"
                class="w-full"
                placeholder="Defaults to the site name"
                maxlength="80"
                @keydown.enter.prevent="commitAdd"
              />
            </AppFormField>
            <p v-if="addError" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ addError }}</p>
            <div class="flex items-center gap-2">
              <Button label="Add link" rounded class="min-h-11" @click="commitAdd" />
              <Button label="Cancel" severity="secondary" text rounded class="min-h-11" @click="cancelAdd" />
            </div>
          </div>
          <Button
            v-else
            label="Add a link"
            severity="secondary"
            rounded
            class="min-h-11"
            :disabled="atLimit"
            @click="startAdd"
          >
            <template #icon>
              <Icon name="tabler:plus" aria-hidden="true" />
            </template>
          </Button>
          <p v-if="atLimit && !adding" class="mt-2 text-sm moh-text-muted">You've reached the limit of {{ maxLinks }} links.</p>
        </div>

        <AppInlineAlert v-if="saveError" severity="danger" class="mt-4">{{ saveError }}</AppInlineAlert>

        <div v-if="canAddCustomLinks" class="mt-4 flex items-center gap-3">
          <AppSaveButton
            label="Save links"
            class="min-h-11"
            :loading="saving"
            :disabled="!dirty"
            @click="save"
          />
          <span v-if="justSaved" class="text-sm text-green-700 dark:text-green-300" role="status">Saved.</span>
          <span v-else-if="dirty" class="text-sm moh-text-muted">Unsaved changes</span>
        </div>
      </section>
    </template>

    <AppLinksShareLinksPageDialog
      v-if="username"
      v-model="shareOpen"
      :username="username"
      :name="authUser?.name ?? null"
      :bio="authUser?.bio ?? null"
    />
  </div>
</template>

<script setup lang="ts">
import { useSettingsLinks } from '~/composables/settings/useSettingsLinks'
import type { MyConnectedAccount } from '~/types/api'
import type { DraftLink } from '~/utils/profile-links-editor'
import { normalizeLinkUrl } from '~/utils/profile-links-editor'
import { CONNECTED_NETWORK_LABELS, followerCountLabel, linksPagePath } from '~/utils/profile-link-icons'

const { user: authUser } = useAuth()
const {
  loaded,
  loadError,
  connectedAccounts,
  canAddCustomLinks,
  maxLinks,
  path,
  drafts,
  dirty,
  atLimit,
  saving,
  saveError,
  justSaved,
  followerToggleError,
  load,
  addLink,
  updateLink,
  removeLink,
  moveBy,
  moveTo,
  save,
  setShowFollowerCount,
} = useSettingsLinks()

const username = computed(() => authUser.value?.username ?? null)
const previewPath = computed(() => path.value || (username.value ? linksPagePath(username.value) : null))
const shareOpen = ref(false)

function accountCaption(account: MyConnectedAccount): string {
  const label = CONNECTED_NETWORK_LABELS[account.network] ?? account.network
  return account.showFollowerCount && typeof account.followerCount === 'number'
    ? `${label} · ${followerCountLabel(account.followerCount)}`
    : label
}

function linkLabel(link: DraftLink): string {
  return link.title || link.host || 'link'
}

function looksLikeUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeLinkUrl(raw))
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

// ─── Add ─────────────────────────────────────────────────────────────
const adding = ref(false)
const addUrl = ref('')
const addTitle = ref('')
const addError = ref<string | null>(null)
const addUrlInput = ref<{ $el?: HTMLElement } | null>(null)

async function startAdd() {
  cancelEdit()
  adding.value = true
  await nextTick()
  addUrlInput.value?.$el?.focus?.()
}
function cancelAdd() {
  adding.value = false
  addUrl.value = ''
  addTitle.value = ''
  addError.value = null
}
function commitAdd() {
  if (!looksLikeUrl(addUrl.value)) {
    addError.value = 'Enter a full web address, like https://example.com.'
    return
  }
  if (!addLink(addUrl.value, addTitle.value)) {
    addError.value = `You can add up to ${maxLinks.value} links.`
    return
  }
  cancelAdd()
}

// ─── Edit ────────────────────────────────────────────────────────────
const editingKey = ref<string | null>(null)
const editUrl = ref('')
const editTitle = ref('')
const editError = ref<string | null>(null)

function startEdit(link: DraftLink) {
  cancelAdd()
  editingKey.value = link.key
  editUrl.value = link.url
  editTitle.value = link.title
  editError.value = null
}
function cancelEdit() {
  editingKey.value = null
  editError.value = null
}
function commitEdit(key: string) {
  if (!looksLikeUrl(editUrl.value)) {
    editError.value = 'Enter a full web address, like https://example.com.'
    return
  }
  updateLink(key, editUrl.value, editTitle.value)
  cancelEdit()
}

// ─── Drag to reorder (mouse). Up/Down buttons cover keyboard and touch. ──
const draggingKey = ref<string | null>(null)
const overKey = ref<string | null>(null)

function onDragStart(key: string, event: DragEvent) {
  draggingKey.value = key
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}
function onDragOver(key: string) {
  if (draggingKey.value) overKey.value = key
}
function onDrop(key: string) {
  if (draggingKey.value && draggingKey.value !== key) moveTo(draggingKey.value, key)
  onDragEnd()
}
function onDragEnd() {
  draggingKey.value = null
  overKey.value = null
}

onMounted(() => {
  void load()
})
</script>
