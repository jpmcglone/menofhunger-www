<template>
  <div ref="rootEl" class="relative flex items-center justify-center gap-3">
    <!-- Desktop: pick mic / camera / speaker. Phones have one of each; Flip covers camera. -->
    <div v-if="showDevicePicker" class="relative">
      <button
        type="button"
        class="moh-call-btn moh-call-btn-secondary"
        aria-label="Choose microphone, camera, or speaker"
        :aria-expanded="devicesOpen"
        aria-haspopup="menu"
        @click="devicesOpen = !devicesOpen"
      >
        <Icon name="tabler:settings" size="20" aria-hidden="true" />
      </button>
      <div
        v-if="devicesOpen"
        class="absolute bottom-[calc(100%+0.75rem)] left-0 z-20 w-64 overflow-hidden rounded-2xl bg-zinc-800 text-white shadow-xl ring-1 ring-white/10"
        role="menu"
      >
        <p v-if="!hasDevices" class="px-3 py-2.5 text-sm text-white/60">No devices found</p>
        <template v-else>
          <section v-if="microphones.length" class="border-b border-white/10 last:border-b-0">
            <h3 class="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">Microphone</h3>
            <button
              v-for="(d, i) in microphones"
              :key="d.deviceId"
              type="button"
              role="menuitemradio"
              :aria-checked="d.deviceId === audioDeviceId"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              @click="onSelectMicrophone(d.deviceId)"
            >
              <Icon :name="d.deviceId === audioDeviceId ? 'tabler:check' : 'tabler:circle'" size="14" :class="d.deviceId === audioDeviceId ? '' : 'opacity-0'" aria-hidden="true" />
              <span class="truncate">{{ d.label || `Microphone ${i + 1}` }}</span>
            </button>
          </section>
          <section v-if="cameras.length" class="border-b border-white/10 last:border-b-0">
            <h3 class="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">Camera</h3>
            <button
              v-for="(d, i) in cameras"
              :key="d.deviceId"
              type="button"
              role="menuitemradio"
              :aria-checked="d.deviceId === videoDeviceId"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              @click="onSelectCamera(d.deviceId)"
            >
              <Icon :name="d.deviceId === videoDeviceId ? 'tabler:check' : 'tabler:circle'" size="14" :class="d.deviceId === videoDeviceId ? '' : 'opacity-0'" aria-hidden="true" />
              <span class="truncate">{{ d.label || `Camera ${i + 1}` }}</span>
            </button>
          </section>
          <section v-if="supportsSpeakerSelection && speakers.length">
            <h3 class="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">Speaker</h3>
            <button
              v-for="(d, i) in speakers"
              :key="d.deviceId"
              type="button"
              role="menuitemradio"
              :aria-checked="d.deviceId === speakerDeviceId"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              @click="onSelectSpeaker(d.deviceId)"
            >
              <Icon :name="d.deviceId === speakerDeviceId ? 'tabler:check' : 'tabler:circle'" size="14" :class="d.deviceId === speakerDeviceId ? '' : 'opacity-0'" aria-hidden="true" />
              <span class="truncate">{{ d.label || `Speaker ${i + 1}` }}</span>
            </button>
          </section>
        </template>
      </div>
    </div>

    <button
      type="button"
      class="moh-call-btn"
      :class="micEnabled ? 'moh-call-btn-secondary' : 'moh-call-btn-off'"
      :aria-label="micEnabled ? 'Mute microphone' : 'Unmute microphone'"
      :aria-pressed="!micEnabled"
      @click="emit('toggleMic')"
    >
      <Icon :name="micEnabled ? 'tabler:microphone' : 'tabler:microphone-off'" size="22" aria-hidden="true" />
    </button>

    <button
      type="button"
      class="moh-call-btn"
      :class="cameraEnabled ? 'moh-call-btn-secondary' : 'moh-call-btn-off'"
      :aria-label="cameraEnabled ? 'Turn camera off' : 'Turn camera on'"
      :aria-pressed="!cameraEnabled"
      @click="emit('toggleCamera')"
    >
      <Icon :name="cameraEnabled ? 'tabler:video' : 'tabler:video-off'" size="22" aria-hidden="true" />
    </button>

    <button
      v-if="showFlip"
      type="button"
      class="moh-call-btn moh-call-btn-secondary"
      aria-label="Flip camera"
      @click="emit('switchCamera')"
    >
      <Icon name="tabler:camera-rotate" size="20" aria-hidden="true" />
    </button>

    <button
      v-if="showScreenShare"
      type="button"
      class="moh-call-btn"
      :class="screenSharing ? 'moh-call-btn-off' : 'moh-call-btn-secondary'"
      :aria-label="screenSharing ? 'Stop sharing screen' : 'Share screen'"
      :aria-pressed="screenSharing"
      data-testid="call-share-screen"
      @click="emit('toggleScreenShare')"
    >
      <Icon :name="screenSharing ? 'tabler:screen-share-off' : 'tabler:screen-share'" size="20" aria-hidden="true" />
    </button>

    <div v-if="showReactions" class="relative">
      <button
        type="button"
        class="moh-call-btn moh-call-btn-secondary"
        aria-label="Send a reaction"
        :aria-expanded="reactionsOpen"
        aria-haspopup="menu"
        data-testid="call-reaction-picker"
        @click="reactionsOpen = !reactionsOpen"
      >
        <Icon name="tabler:mood-plus" size="20" aria-hidden="true" />
      </button>
      <div
        v-if="reactionsOpen"
        class="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-20 -translate-x-1/2 flex gap-1 rounded-2xl bg-zinc-800 p-1.5 shadow-xl ring-1 ring-white/10"
        role="menu"
      >
        <button
          v-for="emoji in CALL_REACTION_EMOJIS"
          :key="emoji"
          type="button"
          role="menuitem"
          class="h-10 w-10 rounded-xl text-xl hover:bg-white/10"
          :aria-label="`React ${emoji}`"
          @click="onPickReaction(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <button
      type="button"
      class="moh-call-btn moh-call-btn-leave"
      :aria-label="leaveLabel"
      @click="emit('leave')"
    >
      <Icon name="tabler:phone-off" size="22" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { CALL_REACTION_EMOJIS } from '~/composables/calls/callReactions'
import { canScreenShare, isCoarsePointer, useCallDevices } from '~/composables/calls/useCallDevices'

const props = withDefaults(
  defineProps<{
    micEnabled: boolean
    cameraEnabled: boolean
    audioDeviceId: string | null
    videoDeviceId: string | null
    speakerDeviceId: string | null
    leaveLabel?: string
    showDevices?: boolean
    screenSharing?: boolean
    showReactions?: boolean
    allowScreenShare?: boolean
  }>(),
  { leaveLabel: 'Leave call', showDevices: true, screenSharing: false, showReactions: true, allowScreenShare: true },
)

const emit = defineEmits<{
  toggleMic: []
  toggleCamera: []
  switchCamera: []
  toggleScreenShare: []
  react: [emoji: string]
  leave: []
  selectMicrophone: [deviceId: string]
  selectCamera: [deviceId: string]
  selectSpeaker: [deviceId: string]
}>()

const rootEl = ref<HTMLElement | null>(null)
const devicesOpen = ref(false)
const reactionsOpen = ref(false)
const { microphones, cameras, speakers, supportsSpeakerSelection, ensureDeviceLabels } = useCallDevices()

const isTouch = computed(() => isCoarsePointer())
const showDevicePicker = computed(() => props.showDevices && !isTouch.value)
const showFlip = computed(() => props.cameraEnabled && !props.screenSharing && (isTouch.value || cameras.value.length > 1))
const showScreenShare = computed(() => props.allowScreenShare && canScreenShare())
const hasDevices = computed(
  () =>
    microphones.value.length > 0 ||
    cameras.value.length > 0 ||
    (supportsSpeakerSelection.value && speakers.value.length > 0),
)

onMounted(() => {
  if (showDevicePicker.value) void ensureDeviceLabels()
})

watch(devicesOpen, (open) => {
  if (open) void ensureDeviceLabels()
})

onClickOutside(rootEl, () => {
  devicesOpen.value = false
  reactionsOpen.value = false
})

function onPickReaction(emoji: string) {
  emit('react', emoji)
  reactionsOpen.value = false
}

function onSelectMicrophone(id: string) {
  emit('selectMicrophone', id)
  devicesOpen.value = false
}
function onSelectCamera(id: string) {
  emit('selectCamera', id)
  devicesOpen.value = false
}
function onSelectSpeaker(id: string) {
  emit('selectSpeaker', id)
  devicesOpen.value = false
}
</script>

<style scoped>
.moh-call-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 3.25rem;
  width: 3.25rem;
  border-radius: 9999px;
  color: #fff;
  transition: background-color 150ms ease, transform 120ms ease;
  cursor: pointer;
}
.moh-call-btn:active {
  transform: scale(0.96);
}
.moh-call-btn-secondary {
  background: rgba(255, 255, 255, 0.14);
}
.moh-call-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.22);
}
.moh-call-btn-off {
  background: #fff;
  color: #111827;
}
.moh-call-btn-off:hover {
  background: #e5e7eb;
}
.moh-call-btn-leave {
  background: #dc2626;
  width: 4rem;
}
.moh-call-btn-leave:hover {
  background: #b91c1c;
}
</style>
