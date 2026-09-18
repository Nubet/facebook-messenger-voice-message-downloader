import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {
  isAudioDetectedMessage,
  isPlayerRegisteredMessage,
  type AudioDetectedMessage,
  type PlayerRegisteredMessage,
} from '../../messaging/audio-messages'
import type {ExecutionContext} from '../../domain/audio/execution-context'
import {
  isBlobDownloadMessage,
  isConvertedDownloadMessage,
  isDownloadRequestedMessage,
  type BlobDownloadMessage,
  type ConvertedDownloadMessage,
  type DownloadRequestedMessage,
} from '../../messaging/download-messages'

type AudioCandidateListener = (
  candidate: AudioCandidate,
  sender: chrome.runtime.MessageSender
) => void
type PlayerRegistration = Omit<PlayerRegisteredMessage, 'type'>
type PlayerRegistrationListener = (
  registration: PlayerRegistration,
  sender: chrome.runtime.MessageSender
) => void
type DownloadRequestListener = (
  request: DownloadRequestedMessage,
  sender: chrome.runtime.MessageSender
) => void
type BlobDownloadListener = (message: BlobDownloadMessage) => void
type ConvertedDownloadListener = (message: ConvertedDownloadMessage) => void

export const browserMessaging = {
  sendAudioCandidateToBackground(candidate: AudioCandidate) {
    chrome.runtime.sendMessage(
      {type: 'audio.detected', candidate} satisfies AudioDetectedMessage,
      () => void chrome.runtime.lastError
    )
  },

  sendAudioCandidateToTab(tabId: number, candidate: AudioCandidate) {
    chrome.tabs.sendMessage(
      tabId,
      {type: 'audio.detected', candidate} satisfies AudioDetectedMessage,
      () => void chrome.runtime.lastError
    )
  },

  sendPlayerRegistration(registration: PlayerRegistration) {
    chrome.runtime.sendMessage(
      {type: 'player.registered', ...registration} satisfies PlayerRegisteredMessage,
      () => void chrome.runtime.lastError
    )
  },

  sendDownloadRequest(playerId: string, context: ExecutionContext) {
    chrome.runtime.sendMessage(
      {type: 'download.requested', playerId, context} satisfies DownloadRequestedMessage,
      () => void chrome.runtime.lastError
    )
  },

  sendBlobDownloadToTab(tabId: number, url: string, filename: string) {
    chrome.tabs.sendMessage(
      tabId,
      {type: 'download.blob', url, filename} satisfies BlobDownloadMessage,
      () => void chrome.runtime.lastError
    )
  },

  sendConvertedDownloadToTab(tabId: number, url: string, filename: string) {
    chrome.tabs.sendMessage(
      tabId,
      {type: 'download.converted', url, filename} satisfies ConvertedDownloadMessage,
      () => void chrome.runtime.lastError
    )
  },

  subscribeToAudioCandidates(listener: AudioCandidateListener) {
    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender
    ) => {
      if (isAudioDetectedMessage(message)) listener(message.candidate, sender)
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToPlayerRegistrations(listener: PlayerRegistrationListener) {
    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender
    ) => {
      if (isPlayerRegisteredMessage(message)) {
        listener(message, sender)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToDownloadRequests(listener: DownloadRequestListener) {
    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender
    ) => {
      if (isDownloadRequestedMessage(message)) listener(message, sender)
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToBlobDownloads(listener: BlobDownloadListener) {
    const handleMessage = (message: unknown) => {
      if (isBlobDownloadMessage(message)) listener(message)
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToConvertedDownloads(listener: ConvertedDownloadListener) {
    const handleMessage = (message: unknown) => {
      if (isConvertedDownloadMessage(message)) listener(message)
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },
}
