const ALLOWED_NETWORK_HOSTS = ['fbcdn.net', 'fbsbx.com', 'cdninstagram.com'] as const

export function isAllowedDownloadUrl(value: string) {
  if (value.startsWith('blob:')) return true

  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      ALLOWED_NETWORK_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      )
    )
  } catch {
    return false
  }
}

export function getDownloadFilename(
  mimeType: string | null,
  timestamp = Date.now()
) {
  const extension = getExtension(mimeType)
  return `voice-message-${timestamp}.${extension}`
}

function getExtension(mimeType: string | null) {
  if (!mimeType) return 'mp4'

  const normalized = mimeType.toLowerCase()
  if (normalized.includes('mpeg')) return 'mp3'
  if (normalized.includes('wav')) return 'wav'
  if (normalized.includes('webm')) return 'webm'
  if (normalized.includes('ogg')) return 'ogg'
  if (normalized.includes('flac')) return 'flac'
  if (normalized.includes('aac')) return 'aac'
  if (normalized.includes('mp4')) return 'mp4'

  return 'bin'
}
