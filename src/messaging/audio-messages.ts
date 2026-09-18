import type {AudioCandidate} from '../domain/audio/audio-candidate'

export type AudioDetectedMessage = {
  type: 'audio.detected'
  candidate: AudioCandidate
}

export function isAudioDetectedMessage(
  value: unknown
): value is AudioDetectedMessage {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Partial<AudioDetectedMessage>
  return message.type === 'audio.detected' && isAudioCandidate(message.candidate)
}

function isAudioCandidate(value: unknown): value is AudioCandidate {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<AudioCandidate>
  return (
    typeof candidate.url === 'string' &&
    typeof candidate.durationMs === 'number' &&
    (candidate.mimeType === null || typeof candidate.mimeType === 'string') &&
    (candidate.source === 'network' || candidate.source === 'blob') &&
    isExecutionContext(candidate.context)
  )
}

function isExecutionContext(value: unknown) {
  if (typeof value !== 'object' || value === null) return false

  const context = value as {tabId?: unknown; frameId?: unknown; documentId?: unknown}
  return (
    (typeof context.tabId === 'number' || context.tabId === null) &&
    typeof context.frameId === 'number' &&
    (context.documentId === undefined || typeof context.documentId === 'string')
  )
}
