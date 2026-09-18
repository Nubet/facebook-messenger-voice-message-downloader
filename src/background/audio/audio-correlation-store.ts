import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {
  isExecutionContext,
  type ExecutionContext,
} from '../../domain/audio/execution-context'
import type {
  PersistedAudioRecord,
  PersistedCorrelationState,
  PersistedPlayerRecord,
  StorePersistence,
} from '../../domain/audio/correlation-persistence'

const DEFAULT_TTL_MS = 30_000
const DEFAULT_MAX_RECORDS = 200
const DEFAULT_DURATION_TOLERANCE_MS = 1_500

type PlayerRecord = PersistedPlayerRecord
type AudioRecord = PersistedAudioRecord

export type CorrelationMatch = {
  playerId: string
  candidate: AudioCandidate
}

export type AudioCorrelationStoreOptions = {
  now?: () => number
  persistence?: StorePersistence
  ttlMs?: number
  maxRecords?: number
  durationToleranceMs?: number
}

export class AudioCorrelationStore {
  private readonly players = new Map<string, PlayerRecord>()
  private readonly audio = new Map<string, AudioRecord>()
  private readonly readyCandidates = new Map<
    string,
    {candidate: AudioCandidate; createdAt: number}
  >()
  private readonly now: () => number
  private readonly persistence: StorePersistence
  private readonly ttlMs: number
  private readonly maxRecords: number
  private readonly durationToleranceMs: number
  private readonly readyPromise: Promise<void>
  private saveQueue = Promise.resolve()

  constructor(options: AudioCorrelationStoreOptions = {}) {
    this.now = options.now ?? Date.now
    this.persistence = options.persistence ?? emptyPersistence
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS
    this.durationToleranceMs =
      options.durationToleranceMs ?? DEFAULT_DURATION_TOLERANCE_MS
    this.readyPromise = this.restore()
  }

  async registerPlayer(
    playerId: string,
    durationMs: number,
    context: ExecutionContext
  ): Promise<CorrelationMatch | null> {
    await this.readyPromise
    this.cleanup()

    const playerKey = this.getPlayerKey(playerId, context)
    this.players.delete(playerKey)

    const match = this.findAudioMatch(durationMs, context)
    if (match) {
      this.audio.delete(match.key)
      this.readyCandidates.set(
        this.getPlayerKey(playerId, context),
        {candidate: match.record.candidate, createdAt: this.now()}
      )
      await this.persist()
      return {playerId, candidate: match.record.candidate}
    }

    this.players.set(playerKey, {
      playerId,
      durationMs,
      context,
      createdAt: this.now(),
    })
    this.enforceLimit()
    await this.persist()
    return null
  }

  async registerAudio(candidate: AudioCandidate): Promise<CorrelationMatch | null> {
    await this.readyPromise
    this.cleanup()

    if (candidate.durationMs <= 0) return null

    const match = this.findPlayerMatch(candidate)
    if (match) {
      this.players.delete(match.key)
      this.readyCandidates.set(
        this.getPlayerKey(match.record.playerId, match.record.context),
        {candidate, createdAt: this.now()}
      )
      await this.persist()
      return {playerId: match.record.playerId, candidate}
    }

    const audioKey = this.getAudioKey(candidate)
    this.audio.set(audioKey, {candidate, createdAt: this.now()})
    this.enforceLimit()
    await this.persist()
    return null
  }

  async takeCandidate(playerId: string, context: ExecutionContext) {
    await this.readyPromise
    this.cleanup()

    const key = this.getPlayerKey(playerId, context)
    const readyCandidate = this.readyCandidates.get(key)
    if (!readyCandidate) return null

    this.readyCandidates.delete(key)
    await this.persist()
    return readyCandidate.candidate
  }

  private async restore() {
    const state = await this.persistence.load().catch(() => null)
    if (!state) return

    state.players.forEach((record) => {
      if (isPlayerRecord(record)) {
        this.players.set(this.getPlayerKey(record.playerId, record.context), record)
      }
    })

    state.audio.forEach((record) => {
      if (isAudioRecord(record) && record.candidate.source !== 'blob') {
        this.audio.set(this.getAudioKey(record.candidate), record)
      }
    })

    this.cleanup()
  }

  private findAudioMatch(durationMs: number, context: ExecutionContext) {
    let best: {key: string; record: AudioRecord; score: number} | null = null

    for (const [key, record] of this.audio) {
      if (!sameContext(record.candidate.context, context)) continue

      const durationDiff = Math.abs(record.candidate.durationMs - durationMs)
      if (durationDiff > this.durationToleranceMs) continue

      const score = durationDiff * 1000 + Math.abs(record.createdAt - this.now())
      if (!best || score < best.score) best = {key, record, score}
    }

    return best
  }

  private findPlayerMatch(candidate: AudioCandidate) {
    let best: {key: string; record: PlayerRecord; score: number} | null = null

    for (const [key, record] of this.players) {
      if (!sameContext(record.context, candidate.context)) continue

      const durationDiff = Math.abs(record.durationMs - candidate.durationMs)
      if (durationDiff > this.durationToleranceMs) continue

      const score = durationDiff * 1000 + Math.abs(record.createdAt - this.now())
      if (!best || score < best.score) best = {key, record, score}
    }

    return best
  }

  private cleanup() {
    const expiresAt = this.now() - this.ttlMs

    for (const [key, record] of this.players) {
      if (record.createdAt < expiresAt) this.players.delete(key)
    }

    for (const [key, record] of this.audio) {
      if (record.createdAt < expiresAt) this.audio.delete(key)
    }

    for (const [key, record] of this.readyCandidates) {
      if (record.createdAt < expiresAt) this.readyCandidates.delete(key)
    }

    this.enforceLimit()
  }

  private enforceLimit() {
    while (this.players.size + this.audio.size > this.maxRecords) {
      const oldestPlayer = this.getOldest(this.players)
      const oldestAudio = this.getOldest(this.audio)

      if (!oldestAudio || (oldestPlayer && oldestPlayer.createdAt <= oldestAudio.createdAt)) {
        if (!oldestPlayer) return
        this.players.delete(oldestPlayer.key)
      } else {
        this.audio.delete(oldestAudio.key)
      }
    }
  }

  private getOldest<T extends {createdAt: number}>(records: Map<string, T>) {
    let oldest: {key: string; createdAt: number} | null = null

    for (const [key, record] of records) {
      if (!oldest || record.createdAt < oldest.createdAt) {
        oldest = {key, createdAt: record.createdAt}
      }
    }

    return oldest
  }

  private async persist() {
    const state = this.serialize()
    this.saveQueue = this.saveQueue
      .then(() => this.persistence.save(state))
      .catch(() => undefined)
    await this.saveQueue
  }

  private serialize(): PersistedCorrelationState {
    return {
      players: [...this.players.values()],
      audio: [...this.audio.values()].filter(
        (record) => record.candidate.source !== 'blob'
      ),
    }
  }

  private getPlayerKey(playerId: string, context: ExecutionContext) {
    return `${getContextKey(context)}:player:${playerId}`
  }

  private getAudioKey(candidate: AudioCandidate) {
    return `${getContextKey(candidate.context)}:audio:${candidate.url}`
  }
}

function sameContext(left: ExecutionContext, right: ExecutionContext) {
  return (
    left.tabId === right.tabId &&
    left.frameId === right.frameId &&
    left.documentId === right.documentId
  )
}

function getContextKey(context: ExecutionContext) {
  return `${context.tabId ?? 'unknown'}:${context.frameId}:${context.documentId ?? 'unknown'}`
}

function isPlayerRecord(value: unknown): value is PlayerRecord {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Partial<PlayerRecord>
  return (
    typeof record.playerId === 'string' &&
    typeof record.durationMs === 'number' &&
    typeof record.createdAt === 'number' &&
    isExecutionContext(record.context)
  )
}

function isAudioRecord(value: unknown): value is AudioRecord {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Partial<AudioRecord>
  const candidate = record.candidate
  return (
    typeof record.createdAt === 'number' &&
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.url === 'string' &&
    typeof candidate.durationMs === 'number' &&
    (candidate.source === 'network' || candidate.source === 'blob') &&
    isExecutionContext(candidate.context)
  )
}

const emptyPersistence: StorePersistence = {
  async load() {
    return null
  },
  async save() {},
}
