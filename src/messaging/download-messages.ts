import {
  isExecutionContext,
  type ExecutionContext,
} from '../domain/audio/execution-context'

export type DownloadRequestedMessage = {
  type: 'download.requested'
  playerId: string
  context: ExecutionContext
}

export type BlobDownloadMessage = {
  type: 'download.blob'
  url: string
  filename: string
}

export function isDownloadRequestedMessage(
  value: unknown
): value is DownloadRequestedMessage {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Partial<DownloadRequestedMessage>
  return (
    message.type === 'download.requested' &&
    typeof message.playerId === 'string' &&
    isExecutionContext(message.context)
  )
}

export function isBlobDownloadMessage(
  value: unknown
): value is BlobDownloadMessage {
  if (typeof value !== 'object' || value === null) return false

  const message = value as Partial<BlobDownloadMessage>
  return (
    message.type === 'download.blob' &&
    typeof message.url === 'string' &&
    typeof message.filename === 'string'
  )
}
