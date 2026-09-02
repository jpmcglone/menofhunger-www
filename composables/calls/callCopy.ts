/**
 * Accurate, reusable wording for how calls travel. Only claims what P2P WebRTC actually does:
 * DTLS-SRTP between devices, servers used for signaling only. Do not reuse for DMs/text.
 */
export const CALL_ENCRYPTION_SHORT = 'Peer-to-peer encrypted'

export const CALL_ENCRYPTION_SENTENCE =
  'Calls are peer-to-peer encrypted. Video and audio travel directly between devices; our servers only help the call connect and never see or store it.'
