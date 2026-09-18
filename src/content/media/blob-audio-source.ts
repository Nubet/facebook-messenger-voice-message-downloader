import type {AudioCandidate} from '../../domain/audio/audio-candidate'

type BlobDetectedMessage = {
  source: 'VOICE_MESSAGE_DOWNLOADER'
  type: 'audio.blob-detected'
  blobUrl: string
  blobType: string
  durationMs: number
  blobData?: ArrayBuffer
}

export type AudioCandidateHandler = (candidate: AudioCandidate) => void

export class BlobAudioSource {
  private listening = false

  constructor(private readonly onCandidate: AudioCandidateHandler) {}

  start() {
    if (this.listening) return

    this.listening = true
    this.postCaptureState(true)
    window.addEventListener('message', this.handleMessage)
  }

  stop() {
    if (!this.listening) return

    this.listening = false
    this.postCaptureState(false)
    window.removeEventListener('message', this.handleMessage)
  }

  private postCaptureState(enabled: boolean) {
    window.postMessage(
      {
        source: 'VOICE_MESSAGE_DOWNLOADER',
        type: 'audio.capture-state',
        enabled,
      },
      '*'
    )
  }

  private handleMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== window || !isBlobDetectedMessage(event.data)) return

    const message = event.data
    const url = message.blobData
      ? URL.createObjectURL(new Blob([message.blobData], {type: message.blobType}))
      : message.blobUrl

    this.onCandidate({
      url,
      durationMs: message.durationMs,
      mimeType: message.blobType,
      source: 'blob',
      context: {tabId: null, frameId: 0},
    })
  }
}

function isBlobDetectedMessage(value: unknown): value is BlobDetectedMessage {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Partial<BlobDetectedMessage>
  return (
    message.source === 'VOICE_MESSAGE_DOWNLOADER' &&
    message.type === 'audio.blob-detected' &&
    typeof message.blobUrl === 'string' &&
    typeof message.blobType === 'string' &&
    typeof message.durationMs === 'number'
  )
}
