const SETTINGS_KEY = 'extensionSettings'
const DEFAULT_SETTINGS = {enabled: true}

type ExtensionSettings = typeof DEFAULT_SETTINGS
type StorageChange = {newValue?: unknown}
type ActiveTab = {url?: string}

export type PopupStatus = 'loading' | 'ready' | 'error'

type PopupSnapshot = {
  enabled: boolean
  isSupportedPage: boolean
  pageName: 'Facebook' | 'Messenger' | 'Unknown'
  status: PopupStatus
  errorMessage: string | null
}

const listeners = new Set<() => void>()

let snapshot: PopupSnapshot = {
  ...DEFAULT_SETTINGS,
  isSupportedPage: false,
  pageName: 'Unknown',
  status: 'loading',
  errorMessage: null,
}

export function getPopupSnapshot() {
  return snapshot
}

export function subscribeToPopupState(listener: () => void) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export async function setEnabled(enabled: boolean) {
  updateSnapshot({enabled, errorMessage: null})

  try {
    await setStorage({enabled})
  } catch {
    updateSnapshot({
      status: 'error',
      errorMessage: 'Could not save settings.',
    })
  }
}

void initializePopupState()
chrome.storage.onChanged.addListener(handleStorageChange)

async function initializePopupState() {
  try {
    const [{[SETTINGS_KEY]: storedSettings}, [activeTab]] = await Promise.all([
      getStorage(),
      getActiveTab(),
    ])
    const page = getPageDetails(activeTab?.url)

    updateSnapshot({
      enabled: isExtensionSettings(storedSettings)
        ? storedSettings.enabled
        : DEFAULT_SETTINGS.enabled,
      isSupportedPage: page.isSupported,
      pageName: page.name,
      status: 'ready',
      errorMessage: null,
    })
  } catch {
    updateSnapshot({
      status: 'error',
      errorMessage: 'Could not load extension settings.',
    })
  }
}

function updateSnapshot(update: Partial<PopupSnapshot>) {
  snapshot = {...snapshot, ...update}
  listeners.forEach((listener) => listener())
}

function getStorage() {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.storage.local.get(SETTINGS_KEY, (result) => {
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
    chrome.storage.local.set({[SETTINGS_KEY]: settings}, () => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve()
    })
  })
}

function getActiveTab() {
  return new Promise<ActiveTab[]>((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(tabs)
    })
  })
}

function handleStorageChange(
  changes: Record<string, StorageChange>,
  areaName: string
) {
  if (areaName !== 'local' || !changes[SETTINGS_KEY]) return

  const nextSettings = changes[SETTINGS_KEY].newValue
  if (!isExtensionSettings(nextSettings)) return

  updateSnapshot({enabled: nextSettings.enabled, errorMessage: null})
}

function isExtensionSettings(value: unknown): value is ExtensionSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    typeof value.enabled === 'boolean'
  )
}

function getPageDetails(url: string | undefined) {
  if (!url) return {isSupported: false, name: 'Unknown' as const}

  try {
    const hostname = new URL(url).hostname

    if (hostname === 'www.facebook.com' || hostname.endsWith('.facebook.com')) {
      return {isSupported: true, name: 'Facebook' as const}
    }

    if (hostname === 'www.messenger.com' || hostname.endsWith('.messenger.com')) {
      return {isSupported: true, name: 'Messenger' as const}
    }
  } catch {
    return {isSupported: false, name: 'Unknown' as const}
  }

  return {isSupported: false, name: 'Unknown' as const}
}
