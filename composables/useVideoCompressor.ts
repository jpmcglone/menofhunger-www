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
export function videoNeedsCompression(file: File, width: number, height: number): boolean {
  // Compress if over 50MB OR resolution exceeds 1080p
  return file.size > 50 * 1024 * 1024 || width > 1920 || height > 1080
}

/**
 * Compress a video file in the browser using ffmpeg.wasm.
 * Scales down to max 1080p and re-encodes to H.264/AAC.
 * @param onProgress - called with 0–100 as compression progresses
 */
export async function compressVideo(
  file: File,
  opts: { onProgress?: (pct: number) => void } = {},
): Promise<File> {
  const ffmpeg = await getFFmpeg()

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const inputName = `input.${ext}`

  const onProgress = ({ progress }: { progress: number }) => {
    opts.onProgress?.(Math.round(Math.max(0, Math.min(99, progress * 100))))
  }
  ffmpeg.on('progress', onProgress)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    await ffmpeg.exec([
      '-i', inputName,
      // Scale down only if taller than 1080p; preserve aspect ratio
      '-vf', "scale=-2:'min(1080,ih)'",
      '-c:v', 'libx264',
      '-crf', '28',        // quality sweet spot: visually good, good compression
      '-preset', 'fast',   // fast = good speed/quality tradeoff
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', 'faststart', // put metadata at front for web playback
      'output.mp4',
    ])

    const data = await ffmpeg.readFile('output.mp4')
    opts.onProgress?.(100)

    const u8 = data as Uint8Array
    // Ensure we have a plain ArrayBuffer (not SharedArrayBuffer) for the File constructor
    const buf = new Uint8Array(u8).buffer as ArrayBuffer
    return new File([buf], 'video.mp4', { type: 'video/mp4' })
  } finally {
    ffmpeg.off('progress', onProgress)
    // Clean up virtual FS to free memory
    try { await ffmpeg.deleteFile(inputName) } catch { /* ignore */ }
    try { await ffmpeg.deleteFile('output.mp4') } catch { /* ignore */ }
  }
}
