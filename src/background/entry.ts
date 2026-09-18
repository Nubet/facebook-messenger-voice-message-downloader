import {NetworkAudioSource} from './media/network-audio-source'
import {browserMessaging} from '../infrastructure/browser/browser-messaging'
import {browserStorage} from '../infrastructure/browser/browser-storage'
import {browserCorrelationStorage} from '../infrastructure/browser/browser-correlation-storage'
import {browserDownloads} from '../infrastructure/browser/browser-downloads'
import {isAllowedDownloadUrl, getDownloadFilename} from '../domain/download/download-policy'
import {AudioCorrelationStore} from './audio/audio-correlation-store'
import type {ExecutionContext} from '../domain/audio/execution-context'
import {
  diagnosticError,
  diagnosticInfo,
  setDiagnosticsEnabled,
} from '../shared/diagnostics'

const correlationStore = new AudioCorrelationStore({
  persistence: browserCorrelationStorage,
})

const networkAudioSource = new NetworkAudioSource((candidate) => {
  if (candidate.context.tabId === null) return

  browserMessaging.sendAudioCandidateToTab(candidate.context.tabId, candidate)
})

void browserStorage.getSettings().then((settings) => {
  setDiagnosticsEnabled(settings.diagnostics)
  if (settings.enabled) networkAudioSource.start()
})

browserStorage.subscribeToSettings((settings) => {
  setDiagnosticsEnabled(settings.diagnostics)

  if (settings.enabled) {
    networkAudioSource.start()
    return
  }

  networkAudioSource.stop()
})

browserMessaging.subscribeToAudioCandidates((candidate, sender) => {
  void correlationStore.registerAudio(withSenderContext(candidate, sender))
})

browserMessaging.subscribeToPlayerRegistrations(async (registration, sender) => {
  await correlationStore.registerPlayer(
    registration.playerId,
    registration.durationMs,
    withSenderContext(registration, sender).context
  )
})

  browserMessaging.subscribeToDownloadRequests((request, sender) => {
  return handleDownloadRequest(
    request.playerId,
    request.downloadFormat,
    withSenderContext(request, sender).context
  )
})

async function handleDownloadRequest(
  playerId: string,
  downloadFormat: 'original' | 'wav',
  context: ExecutionContext
) : Promise<import('../messaging/download-messages').DownloadResult> {
  const operationId = `download-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  diagnosticInfo('download.requested', {operationId, playerId, downloadFormat, context})

  const candidate = await correlationStore.getCandidate(playerId, context)
  if (!candidate) {
    diagnosticInfo('download.rejected.no-candidate', {operationId, playerId, context})
    return {success: false, error: 'Audio is not ready yet.'}
  }

  diagnosticInfo('download.candidate', {
    operationId,
    source: candidate.source,
    mimeType: candidate.mimeType,
    durationMs: candidate.durationMs,
    url: describeUrl(candidate.url),
  })

  if (!isAllowedDownloadUrl(candidate.url)) {
    diagnosticInfo('download.rejected.url', {operationId, url: describeUrl(candidate.url)})
    return {success: false, error: 'Audio URL is not allowed.'}
  }

  const filename = getDownloadFilename(
    downloadFormat === 'wav' ? 'audio/wav' : candidate.mimeType
  )

  if (downloadFormat === 'wav') {
    if (context.tabId === null) return {success: false, error: 'Active tab not found.'}

    const result = await browserMessaging.sendConvertedDownloadToTab(
      context.tabId,
      candidate.url,
      filename
    )
    diagnosticInfo('download.converted.result', {operationId, result})
    return result
  }

  if (candidate.source === 'blob') {
    if (!candidate.url.startsWith('blob:') || context.tabId === null) {
      return {success: false, error: 'Blob audio is no longer available.'}
    }

    const result = await browserMessaging.sendBlobDownloadToTab(
      context.tabId,
      candidate.url,
      filename
    )
    diagnosticInfo('download.blob.result', {operationId, result})
    return result
  }

  try {
    await browserDownloads.download(candidate.url, filename)
    diagnosticInfo('download.original.result', {operationId, success: true})
    return {success: true}
  } catch (error) {
    diagnosticError('download.original.failed', error, {
      operationId,
      url: describeUrl(candidate.url),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed.',
    }
  }
}

function describeUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return `${url.slice(0, 100)}${url.length > 100 ? '...' : ''}`
  }
}

function withSenderContext<T extends {context: ExecutionContext}>(
  value: T,
  sender: chrome.runtime.MessageSender
): Omit<T, 'context'> & {context: ExecutionContext} {
  const senderWithDocument = sender as chrome.runtime.MessageSender & {
    documentId?: string
  }

  return {
    ...value,
    context: {
      tabId: value.context.tabId ?? sender.tab?.id ?? null,
      frameId: sender.frameId ?? value.context.frameId,
      documentId: value.context.documentId ?? senderWithDocument.documentId,
    },
  }
}
