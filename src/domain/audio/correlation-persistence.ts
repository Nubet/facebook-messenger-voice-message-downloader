import type {AudioCandidate} from './audio-candidate'
import type {ExecutionContext} from './execution-context'

export type PersistedPlayerRecord = {
  playerId: string
  durationMs: number
  context: ExecutionContext
  createdAt: number
}

export type PersistedAudioRecord = {
  candidate: AudioCandidate
  createdAt: number
}

export type PersistedCorrelationState = {
  players: PersistedPlayerRecord[]
  audio: PersistedAudioRecord[]
}

export type StorePersistence = {
  load(): Promise<PersistedCorrelationState | null>
  save(state: PersistedCorrelationState): Promise<void>
}
