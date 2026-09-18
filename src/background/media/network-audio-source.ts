import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {browserNetwork, type NetworkResponse} from '../../infrastructure/browser/browser-network'

const AUDIO_CONTENT_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
])

const MIN_AUDIO_SIZE_BYTES = 512
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024

export type AudioCandidateHandler = (candidate: AudioCandidate) => void

export class NetworkAudioSource {
  private unsubscribe: (() => void) | null = null
  private readonly processedUrls = new Set<string>()

  constructor(private readonly onCandidate: AudioCandidateHandler) {}

  start() {
    if (this.unsubscribe) return

    this.unsubscribe = browserNetwork.subscribeToResponses((response) => {
      const candidate = toAudioCandidate(response)
      if (!candidate || this.processedUrls.has(candidate.url)) return

      this.processedUrls.add(candidate.url)
      this.onCandidate(candidate)
    })
  }

  stop() {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.processedUrls.clear()
  }
}

function toAudioCandidate(response: NetworkResponse): AudioCandidate | null {
  if (response.method !== 'GET' || ![200, 206].includes(response.statusCode ?? 0)) {
    return null
  }

  const headers = getHeaders(response.responseHeaders)
  if (!AUDIO_CONTENT_TYPES.has(headers.contentType)) return null

  if (
    headers.contentLength > 0 &&
    (headers.contentLength < MIN_AUDIO_SIZE_BYTES ||
      headers.contentLength > MAX_AUDIO_SIZE_BYTES)
  ) {
    return null
  }

  return {
    url: response.url,
    durationMs: 0,
    mimeType: headers.contentType,
    source: 'network',
    context: {
      tabId: response.tabId,
      frameId: response.frameId,
      documentId: response.documentId,
    },
  }
}

function getHeaders(headers: NetworkResponse['responseHeaders']) {
  let contentType = ''
  let contentLength = 0

  for (const header of headers ?? []) {
    const name = header.name.toLowerCase()
    if (name === 'content-type') contentType = header.value?.split(';')[0].trim() ?? ''
    if (name === 'content-length') contentLength = Number.parseInt(header.value ?? '', 10)
  }

  return {contentType, contentLength: Number.isFinite(contentLength) ? contentLength : 0}
}
