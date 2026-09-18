const originalCreateObjectUrl = URL.createObjectURL.bind(URL)
let captureEnabled = false

export default function initial() {
  const handleCommand = (event: MessageEvent<unknown>) => {
    if (event.source !== window || !isCaptureCommand(event.data)) return

    captureEnabled = event.data.enabled
  }

  window.addEventListener('message', handleCommand)

  URL.createObjectURL = (object: Blob | MediaSource) => {
    const blobUrl = originalCreateObjectUrl(object)

    if (captureEnabled && object instanceof Blob && object.type.startsWith('audio/')) {
      const audio = new Audio(blobUrl)
      audio.addEventListener('loadedmetadata', () => {
        void object.arrayBuffer().then((blobData) => {
          window.postMessage(
            {
              source: 'VOICE_MESSAGE_DOWNLOADER',
              type: 'audio.blob-detected',
              blobUrl,
              blobType: object.type,
              durationMs: Number.isFinite(audio.duration)
                ? Math.round(audio.duration * 1000)
                : 0,
              blobData,
            },
            '*',
            [blobData]
          )
        })
      }, {once: true})
    }

    return blobUrl
  }

  return () => {
    window.removeEventListener('message', handleCommand)
    URL.createObjectURL = originalCreateObjectUrl
  }
}

function isCaptureCommand(value: unknown): value is {enabled: boolean} {
  if (typeof value !== 'object' || value === null) return false

  const command = value as {source?: unknown; type?: unknown; enabled?: unknown}
  return (
    command.source === 'VOICE_MESSAGE_DOWNLOADER' &&
    command.type === 'audio.capture-state' &&
    typeof command.enabled === 'boolean'
  )
}
