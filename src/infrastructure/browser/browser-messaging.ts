import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {
  isAudioDetectedMessage,
  isPlayerRegisteredMessage,
  type AudioDetectedMessage,
  type PlayerRegisteredMessage,
} from '../../messaging/audio-messages'
import type {ExecutionContext} from '../../domain/audio/execution-context'
import type {DownloadFormat} from '../../domain/settings/extension-settings'
import {
  isBlobDownloadMessage,
  isConvertedDownloadMessage,
  isDownloadRequestedMessage,
  type BlobDownloadMessage,
  type ConvertedDownloadMessage,
  type DownloadRequestedMessage,
  type DownloadResult,
} from '../../messaging/download-messages'
import {diagnosticError, diagnosticInfo} from '../../shared/diagnostics'

type AudioCandidateListener = (
  candidate: AudioCandidate,
  sender: chrome.runtime.MessageSender
) => void
type PlayerRegistration = Omit<PlayerRegisteredMessage, 'type'>
type PlayerRegistrationListener = (
  registration: PlayerRegistration,
  sender: chrome.runtime.MessageSender
) => Promise<void>
type DownloadRequestListener = (
  request: DownloadRequestedMessage,
  sender: chrome.runtime.MessageSender
) => Promise<DownloadResult>
type BlobDownloadListener = (message: BlobDownloadMessage) => Promise<DownloadResult>
type ConvertedDownloadListener = (message: ConvertedDownloadMessage) => Promise<DownloadResult>

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
    return new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {type: 'player.registered', ...registration} satisfies PlayerRegisteredMessage,
        () => {
          const error = chrome.runtime.lastError
          if (error) {
            reject(new Error(error.message))
            return
          }

          resolve()
        }
      )
    })
  },

  requestDownload(
    playerId: string,
    context: ExecutionContext,
    downloadFormat: DownloadFormat
  ): Promise<DownloadResult> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {type: 'download.requested', playerId, context, downloadFormat} satisfies DownloadRequestedMessage,
        (result?: DownloadResult) => {
          const error = chrome.runtime.lastError
          if (error) {
            diagnosticError('messaging.download.request.failed', error, {
              playerId,
              downloadFormat,
            })
            resolve({success: false, error: error.message})
            return
          }

          const downloadResult = result ?? {
            success: false,
            error: 'No download result received.',
          }
          diagnosticInfo('messaging.download.response', {
            playerId,
            downloadFormat,
            result: downloadResult,
          })
          resolve(downloadResult)
        }
      )
    })
  },

  sendBlobDownloadToTab(tabId: number, url: string, filename: string) {
    return sendDownloadMessage(
      tabId,
      {type: 'download.blob', url, filename} satisfies BlobDownloadMessage
    )
  },

  sendConvertedDownloadToTab(tabId: number, url: string, filename: string) {
    return sendDownloadMessage(
      tabId,
      {type: 'download.converted', url, filename} satisfies ConvertedDownloadMessage
    )
  },

  subscribeToAudioCandidates(listener: AudioCandidateListener) {
    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (result: DownloadResult) => void
    ) => {
      if (isAudioDetectedMessage(message)) listener(message.candidate, sender)
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToPlayerRegistrations(listener: PlayerRegistrationListener) {
    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (result: DownloadResult) => void
    ) => {
      if (!isPlayerRegisteredMessage(message)) return

      void listener(message, sender)
        .then(() => sendResponse({success: true}))
        .catch((error: unknown) => sendResponse({success: false, error: getErrorMessage(error)}))
      return true
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToDownloadRequests(listener: DownloadRequestListener) {
    const handleMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (result: DownloadResult) => void
    ) => {
      if (!isDownloadRequestedMessage(message)) return

      void listener(message, sender).then(sendResponse).catch((error: unknown) => {
        sendResponse({success: false, error: getErrorMessage(error)})
      })
      return true
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToBlobDownloads(listener: BlobDownloadListener) {
    const handleMessage = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (result: DownloadResult) => void
    ) => {
      if (!isBlobDownloadMessage(message)) return

      void listener(message).then(sendResponse).catch((error: unknown) => {
        sendResponse({success: false, error: getErrorMessage(error)})
      })
      return true
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },

  subscribeToConvertedDownloads(listener: ConvertedDownloadListener) {
    const handleMessage = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (result: DownloadResult) => void
    ) => {
      if (!isConvertedDownloadMessage(message)) return

      void listener(message).then(sendResponse).catch((error: unknown) => {
        sendResponse({success: false, error: getErrorMessage(error)})
      })
      return true
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  },
}

function sendDownloadMessage(
  tabId: number,
  message: BlobDownloadMessage | ConvertedDownloadMessage
) {
  return new Promise<DownloadResult>((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (result?: DownloadResult) => {
      const error = chrome.runtime.lastError
      if (error) {
        diagnosticError('messaging.tab-download.failed', error, {tabId, message})
        resolve({success: false, error: error.message})
        return
      }

      const downloadResult = result ?? {
        success: false,
        error: 'No download result received.',
      }
      diagnosticInfo('messaging.tab-download.response', {tabId, downloadResult})
      resolve(downloadResult)
    })
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Download failed.'
}
