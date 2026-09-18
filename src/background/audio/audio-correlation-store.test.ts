import {describe, expect, it} from 'vitest'
import {AudioCorrelationStore} from './audio-correlation-store'
import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import type {ExecutionContext} from '../../domain/audio/execution-context'

const context: ExecutionContext = {tabId: 12, frameId: 0, documentId: 'doc-1'}

function createCandidate(overrides: Partial<AudioCandidate> = {}): AudioCandidate {
  return {
    url: 'https://video.fbcdn.net/audio.mp4',
    durationMs: 4_000,
    mimeType: 'audio/mp4',
    source: 'network',
    context,
    ...overrides,
  }
}

describe('audio correlation store', () => {
  it('matches an audio candidate to a registered player', async () => {
    const store = new AudioCorrelationStore()
    const candidate = createCandidate()

    await store.registerPlayer('player-1', 4_100, context)
    const match = await store.registerAudio(candidate)

    expect(match).toEqual({playerId: 'player-1', candidate})
    await expect(store.takeCandidate('player-1', context)).resolves.toEqual(candidate)
    await expect(store.takeCandidate('player-1', context)).resolves.toBeNull()
  })

  it('does not match candidates from another document', async () => {
    const store = new AudioCorrelationStore()
    const otherContext = {...context, documentId: 'doc-2'}

    await store.registerPlayer('player-1', 4_000, context)
    const match = await store.registerAudio(
      createCandidate({context: otherContext})
    )

    expect(match).toBeNull()
  })

  it('expires stale records', async () => {
    let now = 1_000
    const store = new AudioCorrelationStore({now: () => now, ttlMs: 100})

    await store.registerPlayer('player-1', 4_000, context)
    now += 101

    await store.registerAudio(createCandidate())

    await expect(store.takeCandidate('player-1', context)).resolves.toBeNull()
  })

  it('keeps a candidate available until a download succeeds', async () => {
    const store = new AudioCorrelationStore()
    const candidate = createCandidate()

    await store.registerPlayer('player-1', 4_000, context)
    await store.registerAudio(candidate)

    await expect(store.getCandidate('player-1', context)).resolves.toEqual(candidate)
    await expect(store.getCandidate('player-1', context)).resolves.toEqual(candidate)
    await expect(store.takeCandidate('player-1', context)).resolves.toEqual(candidate)
    await expect(store.getCandidate('player-1', context)).resolves.toBeNull()
  })
})
