import {
  isExecutionContext,
  type ExecutionContext,
} from '../domain/audio/execution-context'
import {isRecord} from '../shared/is-record'
import type {DownloadFormat} from '../domain/settings/extension-settings'

export type DownloadResult = {
  success: boolean
  error?: string
}

export type DownloadRequestedMessage = {
  type: 'download.requested'
  playerId: string
  context: ExecutionContext
  downloadFormat: DownloadFormat
}

export type BlobDownloadMessage = {
  type: 'download.blob'
  url: string
  filename: string
}

export type ConvertedDownloadMessage = {
  type: 'download.converted'
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
    isExecutionContext(value.context) &&
    (value.downloadFormat === 'original' || value.downloadFormat === 'wav')
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

export function isConvertedDownloadMessage(
  value: unknown
): value is ConvertedDownloadMessage {
  if (!isRecord(value)) return false

  return (
    value.type === 'download.converted' &&
    typeof value.url === 'string' &&
    typeof value.filename === 'string'
  )
}
