import {
  isExecutionContext,
  type ExecutionContext,
} from '../domain/audio/execution-context'
import {isRecord} from '../shared/is-record'

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
  if (!isRecord(value)) return false

  return (
    value.type === 'download.requested' &&
    typeof value.playerId === 'string' &&
    isExecutionContext(value.context)
  )
}

export function isBlobDownloadMessage(
  value: unknown
): value is BlobDownloadMessage {
  if (!isRecord(value)) return false

  return (
    value.type === 'download.blob' &&
    typeof value.url === 'string' &&
    typeof value.filename === 'string'
  )
}
