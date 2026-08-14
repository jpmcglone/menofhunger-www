import { describe, expect, it } from 'vitest'

/**
 * Structural guard: spaces notify/schedule live updates must patch in place via
 * `spaces:updated`, not only via HTTP refresh after Notify me.
 */
describe('spaces updated realtime wiring (structural)', () => {
  async function read(path: string) {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    return readFileSync(resolve(process.cwd(), path), 'utf8')
  }

  it('listens for spaces:updated and exposes onUpdated on SpacesCallback', async () => {
    const domains = await read('composables/presence/usePresenceDomains.ts')
    const types = await read('composables/presence/types.ts')
    expect(domains).toMatch(/socket\.on\('spaces:updated'/)
    expect(types).toMatch(/onUpdated\?:\s*\(payload:\s*SpacesUpdatedPayload\)/)
  })

  it('patches the lobby cache from spaces:updated without clobbering viewer flags', async () => {
    const lobby = await read('composables/useSpaceLobby.ts')
    const spaces = await read('composables/useSpaces.ts')
    expect(lobby).toMatch(/onUpdated:\s*\(payload\)\s*=>\s*\{/)
    expect(lobby).toMatch(/patchSpace\(/)
    expect(spaces).toMatch(/function patchSpace\(/)
    expect(spaces).toMatch(/upsertSpace\(\{\s*\.\.\.existing,\s*\.\.\.rest\s*\}\)/)
    expect(spaces).toMatch(/mergeLobbyRefresh/)
    expect(spaces).toMatch(/if \(rest\.isActive \|\| rest\.scheduledAt\)/)
  })

  it('patches mode changes and removes deleted spaces from the lobby cache', async () => {
    const lobby = await read('composables/useSpaceLobby.ts')
    const spaces = await read('composables/useSpaces.ts')
    expect(lobby).toMatch(/onModeChanged:\s*\(payload\)\s*=>\s*\{/)
    expect(spaces).toMatch(/function removeSpace\(/)
    expect(spaces).toMatch(/if \(patch\.deleted\)/)
  })

  it('subscribes to lobby counts from the app shell, not page unmount', async () => {
    const layout = await read('layouts/app.vue')
    const index = await read('pages/spaces/index.vue')
    const spacePage = await read('pages/s/[username].vue')
    expect(layout).toMatch(/subscribeLobbyCounts\(/)
    expect(layout).toMatch(/unsubscribeLobbyCounts\(/)
    expect(index).not.toMatch(/unsubscribeLobbyCounts/)
    expect(index).not.toMatch(/1500/)
    expect(spacePage).not.toMatch(/unsubscribeLobbyCounts/)
  })

  it('binds live listener badges and hides preview chrome', async () => {
    const row = await read('components/app/AppSpaceRow.vue')
    expect(row).toMatch(/lobbyCountForSpace/)
    expect(row).toMatch(/v-if="!preview"/)
  })

  it('renders lobby and preview spaces as cards with implied titles', async () => {
    const row = await read('components/app/AppSpaceRow.vue')
    const index = await read('pages/spaces/index.vue')
    const preview = await read('components/app/post/PostRowLinkPreview.vue')
    const badge = await read('components/app/AppSpaceStatusBadge.vue')
    const spacePage = await read('pages/s/[username].vue')
    const radioBar = await read('components/app/RadioBar.vue')
    expect(row).toMatch(/useSpaceDisplayTitle/)
    expect(row).toMatch(/spaceLobbyRowKind/)
    expect(row).toMatch(/showRadioVisualizer/)
    expect(row).toMatch(/rounded-xl border moh-border/)
    expect(row).toMatch(/getYouTubePosterUrls/)
    expect(index).toMatch(/gap-3/)
    expect(index).not.toMatch(/border-t moh-border/)
    expect(preview).toMatch(/AppSpaceRow is already the card/)
    expect(badge).toMatch(/kind === 'idle'/)
    expect(badge).toMatch(/kind === 'radio'/)
    expect(spacePage).toMatch(/useSpaceDisplayTitle\(space\)/)
    expect(radioBar).toMatch(/useSpaceDisplayTitle/)
  })

  it('swaps the Spaces nav icon for radio or a live watch party', async () => {
    const nav = await read('composables/useAppNav.ts')
    expect(nav).toMatch(/spacesNavGlyph/)
    expect(nav).toMatch(/tabler:music-filled/)
    expect(nav).toMatch(/tabler:device-tv-filled/)
    expect(nav).toMatch(/tabler:layout-grid-filled/)
  })

  it('keeps a single AppRadioBar instance via Teleport', async () => {
    const layout = await read('layouts/app.vue')
    const mounts = layout.match(/<AppRadioBar\s*\/>/g) ?? []
    expect(mounts.length).toBe(1)
    expect(layout).toMatch(/<Teleport/)
  })

  it('re-joins the open space when spaces:updated flips isActive true', async () => {
    const spacePage = await read('pages/s/[username].vue')
    expect(spacePage).toMatch(/wasInactive && updated\.isActive/)
    expect(spacePage).toMatch(/joinNowThatLive/)
    expect(spacePage).toMatch(/requestCurrentState\(s\.id\)/)
    expect(spacePage).toMatch(/spaceReady\.value = true/)
    expect(spacePage).toMatch(/spaceReady\.value = true/)
    expect(spacePage).toMatch(/isAloneHere/)
    expect(spacePage).not.toMatch(/v-if="space && members\.length === 0"/)
  })

  it('re-subscribes to spaces lobbies on socket reconnect', async () => {
    const lobby = await read('composables/useSpaceLobby.ts')
    const presence = await read('composables/usePresence.ts')
    const emitters = await read('composables/presence/createPresenceEmitters.ts')
    expect(lobby).toMatch(/isSocketConnected/)
    expect(lobby).toMatch(/emitSpacesJoin\(selectedSpaceId\.value\)/)
    expect(lobby).toMatch(/emitSpacesLobbiesSubscribe\(\)/)
    expect(presence).toMatch(/syncStickyRooms\(emitters\)/)
    expect(emitters).toMatch(/function syncStickyRooms/)
    expect(emitters).toMatch(/emitSpacesJoin\(selectedSpaceId\)/)
    expect(emitters).toMatch(/emitSpacesChatSubscribe/)
    expect(emitters).toMatch(/emitRadioJoin/)
    expect(emitters).toMatch(/emitMessagesScreen/)
  })

  it('collapses consecutive same-person system lines in live chat', async () => {
    const chat = await read('composables/useSpaceLiveChat.ts')
    expect(chat).toMatch(/collapseAdjacentSpaceChatSystemMessages/)
    expect(chat).toMatch(/finalizeMessageList/)
  })

  it('keeps same-session space chat history on leave and does not backfill missed lines', async () => {
    const chat = await read('composables/useSpaceLiveChat.ts')
    expect(chat).toMatch(/Keep this session's history/)
    expect(chat).not.toMatch(/delete next\[prevId\]/)
    expect(chat).toMatch(/return !\(messagesBySpace\.value\[sid\]\?\.length\)/)
    expect(chat).toMatch(/if \(existing\.length > 0\)/)
    expect(chat).toMatch(/upsertMessages\(existing, incoming\)/)
    expect(chat).toMatch(/writeSpaceChatLocal/)
    expect(chat).toMatch(/loadAllSpaceChatLocal/)
    expect(chat).toMatch(/hydrateFromLocal/)
    expect(chat).toMatch(/spaceChatOwnerId/)
    expect(chat).toMatch(/onChatReaction/)
    expect(chat).toMatch(/applySpaceChatReaction/)
    expect(chat).toMatch(/emitSpacesChatReact/)
    expect(chat).toMatch(/uid !== hydratedForUserId\.value/)
    expect(chat).not.toMatch(/impersonation\?\.adminUserId/)
  })

  it('subscribes to space chat once the lobby has selected that space', async () => {
    const chat = await read('composables/useSpaceLiveChat.ts')
    expect(chat).toMatch(/canSubscribeChat/)
    expect(chat).toMatch(/sid && s && s\.id === sid/)
    expect(chat).toMatch(/if \(sid && canSubscribeChat\.value\)/)
  })

  it('locks the watch-party player to 16:9 with an overlaid local volume control', async () => {
    const spacePage = await read('pages/s/[username].vue')
    const player = await read('components/SpaceYouTubePlayer.vue')
    expect(spacePage).toMatch(/aspect-video/)
    expect(spacePage).toMatch(/flex items-center justify-center/)
    expect(player).toMatch(/isFollowingPlayback/)
    expect(player).toMatch(/isReplacedOwner \? 'bottom-12' : 'bottom-3'/)
    expect(player).toMatch(/:deep\(iframe\)/)
  })
})
