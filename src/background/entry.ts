console.log('[Voice Message Downloader] Background entry loaded')

import {NetworkAudioSource} from './media/network-audio-source'
import {browserMessaging} from '../infrastructure/browser/browser-messaging'
import {browserStorage} from '../infrastructure/browser/browser-storage'
import {browserCorrelationStorage} from '../infrastructure/browser/browser-correlation-storage'
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

function withSenderContext<T extends {context: ExecutionContext}>(
  value: T,
  sender: chrome.runtime.MessageSender
): T {
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
  } as T
}
