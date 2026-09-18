import type {AudioCandidate} from '../domain/audio/audio-candidate'
import {
  isExecutionContext,
  type ExecutionContext,
} from '../domain/audio/execution-context'

export type AudioDetectedMessage = {
  type: 'audio.detected'
  candidate: AudioCandidate
}

export type PlayerRegisteredMessage = {
  type: 'player.registered'
  playerId: string
  durationMs: number
  context: ExecutionContext
}

export function isAudioDetectedMessage(
  value: unknown
): value is AudioDetectedMessage {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Partial<AudioDetectedMessage>
  return message.type === 'audio.detected' && isAudioCandidate(message.candidate)
}

export function isPlayerRegisteredMessage(
  value: unknown
): value is PlayerRegisteredMessage {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Partial<PlayerRegisteredMessage>
  return (
    message.type === 'player.registered' &&
    typeof message.playerId === 'string' &&
    typeof message.durationMs === 'number' &&
    isExecutionContext(message.context)
  )
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
