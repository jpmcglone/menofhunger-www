export const VOICEMAIL_MAX_SECONDS = 60

export function pickVoicemailRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm'
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) return 'video/mp4;codecs=avc1'
  if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) return 'video/webm;codecs=vp8'
  return 'video/webm'
}

export function voicemailFileExtension(mime: string): string {
  return mime.startsWith('video/mp4') ? 'mp4' : 'webm'
}
