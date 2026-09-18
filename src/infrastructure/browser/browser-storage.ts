import {
  DEFAULT_EXTENSION_SETTINGS,
  EXTENSION_SETTINGS_KEY,
  isExtensionSettings,
  type ExtensionSettings,
} from '../../domain/settings/extension-settings'

type StorageChange = {newValue?: unknown}
type SettingsListener = (settings: ExtensionSettings) => void

export const browserStorage = {
  async getSettings(): Promise<ExtensionSettings> {
    const result = await getStorage()
    const settings = result[EXTENSION_SETTINGS_KEY]

    return isExtensionSettings(settings)
      ? {...DEFAULT_EXTENSION_SETTINGS, ...settings}
      : DEFAULT_EXTENSION_SETTINGS
  },

  setSettings(settings: ExtensionSettings) {
    return setStorage(settings)
  },

  subscribeToSettings(listener: SettingsListener) {
    const handleChange = (
      changes: Record<string, StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !changes[EXTENSION_SETTINGS_KEY]) return

      const nextSettings = changes[EXTENSION_SETTINGS_KEY].newValue
      if (isExtensionSettings(nextSettings)) {
        listener({...DEFAULT_EXTENSION_SETTINGS, ...nextSettings})
      }
    }

    chrome.storage.onChanged.addListener(handleChange)

    return () => chrome.storage.onChanged.removeListener(handleChange)
  },
}

function getStorage() {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.storage.local.get(EXTENSION_SETTINGS_KEY, (result) => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(result)
    })
  })
}

function setStorage(settings: ExtensionSettings) {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({[EXTENSION_SETTINGS_KEY]: settings}, () => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve()
    })
  })
}
