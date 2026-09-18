import type {AudioCandidate} from '../domain/audio/audio-candidate'
import {
  isExecutionContext,
  type ExecutionContext,
} from '../domain/audio/execution-context'
import {isRecord} from '../shared/is-record'

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
  if (!isRecord(value)) return false

  return value.type === 'audio.detected' && isAudioCandidate(value.candidate)
}

export function isPlayerRegisteredMessage(
  value: unknown
): value is PlayerRegisteredMessage {
  if (!isRecord(value)) return false

  return (
    value.type === 'player.registered' &&
    typeof value.playerId === 'string' &&
    typeof value.durationMs === 'number' &&
    isExecutionContext(value.context)
  )
}

function isAudioCandidate(value: unknown): value is AudioCandidate {
  if (!isRecord(value)) return false

  return (
    typeof value.url === 'string' &&
    typeof value.durationMs === 'number' &&
    (value.mimeType === null || typeof value.mimeType === 'string') &&
    (value.source === 'network' || value.source === 'blob') &&
    isExecutionContext(value.context)
  )
}
