/**
 * Converts an audio response into a downloadable PCM WAV file.
 *
 * The conversion has two separate parts:
 *
 * 1. The browser decodes OGG/Opus using its native audio codec through
 *    `AudioContext.decodeAudioData()`.
 * 2. This file stores the decoded floating-point samples as 16-bit PCM in a
 *    standard RIFF/WAVE container.
 *
 * No OGG decoder or audio conversion dependency is bundled with the
 * extension. The browser owns the codec-specific part; this module only
 * writes the small, well-defined WAV container around the decoded samples.
 *
 * References:
 * - MDN: decodeAudioData()
 *   https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
 * - MDN: AudioBuffer
 *   https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
 * - Microsoft: RIFF file format
 *   https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-
 */
import {diagnosticError, diagnosticInfo} from '../../shared/diagnostics'

const WAV_HEADER_SIZE = 44

/**
 * Downloads `url`, decodes its audio data in the browser, writes a WAV Blob,
 * and starts a browser download with `filename`.
 *
 * `credentials: 'include'` is needed for Facebook CDN requests that depend
 * on the current browser session. It also works for `blob:` URLs, which are
 * scoped to the current page.
 */
export async function downloadAsWav(url: string, filename: string) {
  diagnosticInfo('wav.fetch.start', {url: describeUrl(url), filename})
  const response = await fetch(url, {credentials: 'include'})
  if (!response.ok) throw new Error(`Audio request failed: ${response.status}`)

  const audioData = await response.arrayBuffer()
  diagnosticInfo('wav.fetch.complete', {url: describeUrl(url), bytes: audioData.byteLength})
  const context = new AudioContext()

  try {
    // decodeAudioData accepts the compressed OGG/Opus bytes and returns raw
    // PCM samples in an AudioBuffer. The copy avoids implementations that
    // detach or reuse the original response buffer.
    const decoded = await context.decodeAudioData(audioData.slice(0))
    diagnosticInfo('wav.decode.complete', {
      channels: decoded.numberOfChannels,
      sampleRate: decoded.sampleRate,
      frames: decoded.length,
    })
    const wav = encodeWav(decoded)
    triggerDownload(wav, filename)
  } finally {
    await context.close()
  }
}

function describeUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return `${url.slice(0, 100)}${url.length > 100 ? '...' : ''}`
  }
}

/**
 * Builds a canonical 16-bit PCM WAV file from an AudioBuffer.
 *
 * WAV uses interleaved samples: for stereo audio the byte order is
 * left-sample, right-sample, left-sample, right-sample, and so on.
 * AudioBuffer stores each channel separately, so the loop below performs
 * that interleaving while converting Web Audio's [-1, 1] floats to signed
 * 16-bit integers.
 *
 * The 44-byte header consists of:
 * - RIFF/WAVE container identifiers,
 * - the `fmt ` chunk describing PCM layout,
 * - the `data` chunk containing the interleaved samples.
 */
function encodeWav(audio: AudioBuffer) {
  const channels = audio.numberOfChannels
  const frames = audio.length
  const bytesPerSample = 2
  const blockAlign = channels * bytesPerSample
  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + frames * blockAlign)
  const view = new DataView(buffer)

  // RIFF chunk descriptor.
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + frames * blockAlign, true)
  writeAscii(view, 8, 'WAVE')

  // fmt chunk: PCM (format 1), channel count, sample rate and bit depth.
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, audio.sampleRate, true)
  view.setUint32(28, audio.sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)

  // data chunk: the actual audio sample bytes start at offset 44.
  writeAscii(view, 36, 'data')
  view.setUint32(40, frames * blockAlign, true)

  const channelData = Array.from({length: channels}, (_, channel) =>
    audio.getChannelData(channel)
  )
  let offset = WAV_HEADER_SIZE

  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]))

      // AudioBuffer samples are normalized floats. WAV PCM uses signed
      // integers, with a slightly asymmetric range: -32768..32767.
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([buffer], {type: 'audio/wav'})
}

/** Writes a short ASCII chunk identifier such as `RIFF`, `WAVE`, or `data`. */
function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

/**
 * Starts a download from a Blob without navigating away from Facebook.
 *
 * Object URLs keep the Blob alive for the browser. They are revoked shortly
 * after the click so the converted audio does not remain allocated forever.
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
