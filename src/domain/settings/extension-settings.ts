export const EXTENSION_SETTINGS_KEY = 'extensionSettings'

export const DEFAULT_EXTENSION_SETTINGS = {
  enabled: true,
} as const

export type ExtensionSettings = {
  enabled: boolean
}

export function isExtensionSettings(value: unknown): value is ExtensionSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    typeof value.enabled === 'boolean'
  )
}
