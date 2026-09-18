import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {isRecord} from '../../shared/is-record'

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
  if (!isRecord(value)) return false

  return (
    value.source === 'VOICE_MESSAGE_DOWNLOADER' &&
    value.type === 'audio.blob-detected' &&
    typeof value.blobUrl === 'string' &&
    typeof value.blobType === 'string' &&
    typeof value.durationMs === 'number'
  )
}
