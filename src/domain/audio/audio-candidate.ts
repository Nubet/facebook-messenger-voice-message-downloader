import type {ExecutionContext} from './execution-context'

export type AudioSource = 'network' | 'blob'

export type AudioCandidate = {
  url: string
  durationMs: number
  mimeType: string | null
  source: AudioSource
  context: ExecutionContext
}
