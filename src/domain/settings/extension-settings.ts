export const EXTENSION_SETTINGS_KEY = 'extensionSettings'

export const DEFAULT_EXTENSION_SETTINGS = {
  enabled: true,
  downloadFormat: 'original',
  diagnostics: false,
} as const

export type DownloadFormat = 'original' | 'wav'

export type ExtensionSettings = {
  enabled: boolean
  downloadFormat: DownloadFormat
  diagnostics: boolean
}

export function isExtensionSettings(value: unknown): value is ExtensionSettings {
  if (typeof value !== 'object' || value === null || !('enabled' in value)) {
    return false
  }

  if (typeof value.enabled !== 'boolean') return false

  if ('diagnostics' in value && typeof value.diagnostics !== 'boolean') return false

  return (
    !('downloadFormat' in value) ||
    value.downloadFormat === 'original' ||
    value.downloadFormat === 'wav'
  )
}
