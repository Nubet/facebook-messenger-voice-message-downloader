import {
  DEFAULT_EXTENSION_SETTINGS,
  type DownloadFormat,
  type ExtensionSettings,
} from '../domain/settings/extension-settings'
import {browserStorage} from '../infrastructure/browser/browser-storage'
import {browserTabs} from '../infrastructure/browser/browser-tabs'

export type PopupStatus = 'loading' | 'ready' | 'error'

type PopupSnapshot = {
  enabled: boolean
  downloadFormat: DownloadFormat
  diagnostics: boolean
  isSupportedPage: boolean
  pageName: 'Facebook' | 'Messenger' | 'Unknown'
  status: PopupStatus
  errorMessage: string | null
}

const listeners = new Set<() => void>()

let snapshot: PopupSnapshot = {
  ...DEFAULT_EXTENSION_SETTINGS,
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
    await browserStorage.setSettings({
      enabled,
      downloadFormat: snapshot.downloadFormat,
      diagnostics: snapshot.diagnostics,
    })
  } catch {
    updateSnapshot({
      status: 'error',
      errorMessage: 'Could not save settings.',
    })
  }
}

export async function setDownloadFormat(downloadFormat: DownloadFormat) {
  updateSnapshot({downloadFormat, errorMessage: null})

  try {
    await browserStorage.setSettings({
      enabled: snapshot.enabled,
      downloadFormat,
      diagnostics: snapshot.diagnostics,
    })
  } catch {
    updateSnapshot({
      status: 'error',
      errorMessage: 'Could not save settings.',
    })
  }
}

export async function setDiagnostics(diagnostics: boolean) {
  updateSnapshot({diagnostics, errorMessage: null})

  try {
    await browserStorage.setSettings({
      enabled: snapshot.enabled,
      downloadFormat: snapshot.downloadFormat,
      diagnostics,
    })
  } catch {
    updateSnapshot({
      status: 'error',
      errorMessage: 'Could not save settings.',
    })
  }
}

void initializePopupState()
browserStorage.subscribeToSettings(handleSettingsChange)

async function initializePopupState() {
  try {
    const [settings, activeTab] = await Promise.all([
      browserStorage.getSettings(),
      browserTabs.getActiveTab(),
    ])
    const page = getPageDetails(activeTab?.url)

    updateSnapshot({
      enabled: settings.enabled,
      downloadFormat: settings.downloadFormat,
      diagnostics: settings.diagnostics,
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

function handleSettingsChange(settings: ExtensionSettings) {
  updateSnapshot({
    enabled: settings.enabled,
    downloadFormat: settings.downloadFormat,
    diagnostics: settings.diagnostics,
    errorMessage: null,
  })
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
