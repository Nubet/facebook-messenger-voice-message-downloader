import type {
  PersistedCorrelationState,
  StorePersistence,
} from '../../domain/audio/correlation-persistence'
import {isRecord} from '../../shared/is-record'

const STORAGE_KEY = 'audioCorrelationState'

export const browserCorrelationStorage: StorePersistence = {
  async load() {
    const storage = chrome.storage.session
    if (!storage) return null

    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      storage.get(STORAGE_KEY, (values) => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }

        resolve(values)
      })
    })

    return isPersistedState(result[STORAGE_KEY])
      ? result[STORAGE_KEY]
      : null
  },

  async save(state) {
    const storage = chrome.storage.session
    if (!storage) return

    await new Promise<void>((resolve, reject) => {
      storage.set({[STORAGE_KEY]: state}, () => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }

        resolve()
      })
    })
  },
}

function isPersistedState(value: unknown): value is PersistedCorrelationState {
  if (!isRecord(value)) return false

  return Array.isArray(value.players) && Array.isArray(value.audio)
}
