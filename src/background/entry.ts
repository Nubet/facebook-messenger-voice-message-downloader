import {NetworkAudioSource} from './media/network-audio-source'
import {browserMessaging} from '../infrastructure/browser/browser-messaging'
import {browserStorage} from '../infrastructure/browser/browser-storage'
import {browserCorrelationStorage} from '../infrastructure/browser/browser-correlation-storage'
import {browserDownloads} from '../infrastructure/browser/browser-downloads'
import {isAllowedDownloadUrl, getDownloadFilename} from '../domain/download/download-policy'
import {AudioCorrelationStore} from './audio/audio-correlation-store'
import type {ExecutionContext} from '../domain/audio/execution-context'

const correlationStore = new AudioCorrelationStore({
  persistence: browserCorrelationStorage,
})

const networkAudioSource = new NetworkAudioSource((candidate) => {
  if (candidate.context.tabId === null) return

  browserMessaging.sendAudioCandidateToTab(candidate.context.tabId, candidate)
})

void browserStorage.getSettings().then((settings) => {
  if (settings.enabled) networkAudioSource.start()
})

browserStorage.subscribeToSettings((settings) => {
  if (settings.enabled) {
    networkAudioSource.start()
    return
  }

  networkAudioSource.stop()
})

browserMessaging.subscribeToAudioCandidates((candidate, sender) => {
  void correlationStore.registerAudio(withSenderContext(candidate, sender))
})

browserMessaging.subscribeToPlayerRegistrations((registration, sender) => {
  void correlationStore.registerPlayer(
    registration.playerId,
    registration.durationMs,
    withSenderContext(registration, sender).context
  )
})

browserMessaging.subscribeToDownloadRequests((request, sender) => {
  void handleDownloadRequest(request.playerId, withSenderContext(request, sender).context)
})

async function handleDownloadRequest(playerId: string, context: ExecutionContext) {
  const candidate = await correlationStore.takeCandidate(playerId, context)
  if (!candidate || !isAllowedDownloadUrl(candidate.url)) return

  const settings = await browserStorage.getSettings()
  const filename = getDownloadFilename(
    settings.downloadFormat === 'wav' ? 'audio/wav' : candidate.mimeType
  )

  if (settings.downloadFormat === 'wav') {
    if (context.tabId === null) return

    browserMessaging.sendConvertedDownloadToTab(context.tabId, candidate.url, filename)
    return
  }

  if (candidate.source === 'blob') {
    if (!candidate.url.startsWith('blob:') || context.tabId === null) return

    browserMessaging.sendBlobDownloadToTab(context.tabId, candidate.url, filename)
    return
  }

  await browserDownloads.download(candidate.url, filename).catch(() => {})
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
