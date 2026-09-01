<template>
  <div class="flex items-center justify-center gap-3">
    <!-- Secondary: devices -->
    <button
      v-if="showDevices"
      type="button"
      class="moh-call-btn moh-call-btn-secondary"
      aria-label="Audio and video settings"
      aria-haspopup="menu"
      @click="deviceMenu?.toggle($event)"
    >
      <Icon name="tabler:settings" size="20" aria-hidden="true" />
    </button>
    <Menu ref="deviceMenu" :model="deviceMenuItems" popup>
      <template #item="{ item, props: itemProps }">
        <a v-bind="itemProps.action" class="flex items-center gap-2">
          <Icon :name="item.iconName ?? 'tabler:circle'" size="14" :class="item.iconName ? '' : 'opacity-0'" aria-hidden="true" />
          <span v-bind="itemProps.label" class="truncate">{{ item.label }}</span>
        </a>
      </template>
    </Menu>

    <!-- Primary: mic -->
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

    <!-- Primary: camera -->
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

    <!-- Secondary: flip camera (touch devices with a camera on) -->
    <button
      v-if="showFlip"
      type="button"
      class="moh-call-btn moh-call-btn-secondary"
      aria-label="Flip camera"
      @click="emit('switchCamera')"
    >
      <Icon name="tabler:camera-rotate" size="20" aria-hidden="true" />
    </button>

    <!-- Primary: leave -->
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
import type { MenuItem } from 'primevue/menuitem'
import type Menu from 'primevue/menu'
import { useCallDevices } from '~/composables/calls/useCallDevices'

const props = withDefaults(
  defineProps<{
    micEnabled: boolean
    cameraEnabled: boolean
    audioDeviceId: string | null
    videoDeviceId: string | null
    speakerDeviceId: string | null
    leaveLabel?: string
    showDevices?: boolean
  }>(),
  { leaveLabel: 'Leave call', showDevices: true },
)

const emit = defineEmits<{
  toggleMic: []
  toggleCamera: []
  switchCamera: []
  leave: []
  selectMicrophone: [deviceId: string]
  selectCamera: [deviceId: string]
  selectSpeaker: [deviceId: string]
}>()

const deviceMenu = ref<InstanceType<typeof Menu> | null>(null)
const { microphones, cameras, speakers, supportsSpeakerSelection, ensureDeviceLabels } = useCallDevices()

const isTouch = computed(() => import.meta.client && window.matchMedia?.('(pointer: coarse)').matches)
const showFlip = computed(() => props.cameraEnabled && (isTouch.value || cameras.value.length > 1))

// Labels are blank until a permission has been granted; the call itself already asked, so this is instant.
onMounted(() => {
  if (props.showDevices) void ensureDeviceLabels()
})

function deviceLabel(d: MediaDeviceInfo, fallback: string, index: number): string {
  return d.label || `${fallback} ${index + 1}`
}

const deviceMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []
  if (microphones.value.length) {
    items.push({
      label: 'Microphone',
      items: microphones.value.map((d, i) => ({
        label: deviceLabel(d, 'Microphone', i),
        iconName: d.deviceId === props.audioDeviceId ? 'tabler:check' : undefined,
        command: () => emit('selectMicrophone', d.deviceId),
      })),
    })
  }
  if (cameras.value.length) {
    items.push({
      label: 'Camera',
      items: cameras.value.map((d, i) => ({
        label: deviceLabel(d, 'Camera', i),
        iconName: d.deviceId === props.videoDeviceId ? 'tabler:check' : undefined,
        command: () => emit('selectCamera', d.deviceId),
      })),
    })
  }
  if (supportsSpeakerSelection.value && speakers.value.length) {
    items.push({
      label: 'Speaker',
      items: speakers.value.map((d, i) => ({
        label: deviceLabel(d, 'Speaker', i),
        iconName: d.deviceId === props.speakerDeviceId ? 'tabler:check' : undefined,
        command: () => emit('selectSpeaker', d.deviceId),
      })),
    })
  }
  if (!items.length) items.push({ label: 'No devices found', disabled: true })
  return items
})
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
