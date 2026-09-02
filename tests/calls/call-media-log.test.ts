import { describe, expect, it } from 'vitest'
import { callMediaSdpMLines, callMediaTrackInfo } from '~/composables/calls/callMediaLog'

describe('callMediaLog helpers', () => {
  it('lists m-line kinds in SDP order', () => {
    expect(callMediaSdpMLines('v=0\nm=audio 9 UDP/TLS/RTP/SAVPF 111\nm=video 9 UDP/TLS/RTP/SAVPF 96\nm=video 9 UDP/TLS/RTP/SAVPF 96\n')).toEqual([
      'audio',
      'video',
      'video',
    ])
    expect(callMediaSdpMLines(null)).toEqual([])
  })

  it('summarizes a track without throwing on a stub', () => {
    expect(callMediaTrackInfo(null)).toBeNull()
    expect(
      callMediaTrackInfo({
        id: 'v1',
        kind: 'video',
        enabled: true,
        muted: true,
        readyState: 'live',
      } as MediaStreamTrack),
    ).toEqual({
      id: 'v1',
      kind: 'video',
      enabled: true,
      muted: true,
      readyState: 'live',
    })
  })
})
