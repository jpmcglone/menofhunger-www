import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

// CDN URLs for the single-threaded core (no SharedArrayBuffer required)
const CORE_VERSION = '0.12.6'
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<void> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance

  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegInstance = ffmpeg
    })().catch((e) => {
      loadPromise = null
      throw e
    })
  }

  await loadPromise
  return ffmpegInstance!
}

/** Estimate compression time in seconds based on file size. Conservative for mobile. */
export function estimateCompressionSeconds(fileSizeMB: number): number {
  // ~1.5 seconds per MB is a safe mobile estimate (can be faster on desktop)
  return Math.max(15, Math.ceil(fileSizeMB * 1.5))
}

export function formatCompressionEstimate(secs: number): string {
  if (secs < 90) return `~${Math.round(secs)}s`
  return `~${Math.round(secs / 60)} min`
}

/** Returns true if the file should be compressed before upload. */
export function videoNeedsCompression(file: File, maxBytes: number): boolean {
  // Only compress when required by the upload limit.
  // If the file is already within limit, skip ffmpeg entirely.
  return file.size > Math.max(1, Math.floor(maxBytes || 0))
}

/**
 * Compress a video file in the browser using ffmpeg.wasm.
 * Scales down to max 1080p and re-encodes to H.264/AAC.
 * @param onProgress - called with 0–100 as compression progresses
 */
export async function compressVideo(
  file: File,
  opts: {
    onProgress?: (pct: number) => void
    targetMaxBytes?: number
  } = {},
): Promise<File> {
  const ffmpeg = await getFFmpeg()

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const inputName = `input.${ext}`

  const onProgress = ({ progress }: { progress: number }) => {
    opts.onProgress?.(Math.round(Math.max(0, Math.min(99, progress * 100))))
  }
  ffmpeg.on('progress', onProgress)

  const targetMaxBytes =
    typeof opts.targetMaxBytes === 'number' && Number.isFinite(opts.targetMaxBytes)
      ? Math.max(1, Math.floor(opts.targetMaxBytes))
      : null

  const profiles: Array<{ crf: string; maxHeight: number; preset: 'fast' | 'veryfast' | 'ultrafast'; audioBitrate: string }> = [
    { crf: '28', maxHeight: 1080, preset: 'fast', audioBitrate: '128k' },
    { crf: '32', maxHeight: 1080, preset: 'veryfast', audioBitrate: '96k' },
    { crf: '36', maxHeight: 720, preset: 'veryfast', audioBitrate: '96k' },
    { crf: '40', maxHeight: 720, preset: 'ultrafast', audioBitrate: '64k' },
  ]

  let smallest: File | null = null
  let lastError: unknown = null

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    for (const [i, profile] of profiles.entries()) {
      const outputName = `output-${i}.mp4`
      try {
        await ffmpeg.exec([
          '-i', inputName,
          // Scale down only if taller than the profile max; preserve aspect ratio.
          '-vf', `scale=-2:'min(${profile.maxHeight},ih)'`,
          '-c:v', 'libx264',
          '-crf', profile.crf,
          '-preset', profile.preset,
          '-c:a', 'aac',
          '-b:a', profile.audioBitrate,
          '-movflags', 'faststart',
          outputName,
        ])

        const data = await ffmpeg.readFile(outputName)
        const u8 = data as Uint8Array
        // Ensure we have a plain ArrayBuffer (not SharedArrayBuffer) for the File constructor.
        const buf = new Uint8Array(u8).buffer as ArrayBuffer
        const out = new File([buf], 'video.mp4', { type: 'video/mp4' })

        if (!smallest || out.size < smallest.size) {
          smallest = out
        }

        if (!targetMaxBytes || out.size <= targetMaxBytes) {
          opts.onProgress?.(100)
          return out
        }
      } catch (err) {
        lastError = err
      } finally {
        try { await ffmpeg.deleteFile(outputName) } catch { /* ignore */ }
      }
    }

    if (smallest) {
      opts.onProgress?.(100)
      return smallest
    }
    throw lastError ?? new Error('Video compression failed.')
  } finally {
    ffmpeg.off('progress', onProgress)
    // Clean up virtual FS to free memory
    try { await ffmpeg.deleteFile(inputName) } catch { /* ignore */ }
  }
}
