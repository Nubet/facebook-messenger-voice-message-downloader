import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {
  isAudioDetectedMessage,
  isPlayerRegisteredMessage,
  type AudioDetectedMessage,
  type PlayerRegisteredMessage,
} from '../../messaging/audio-messages'
import type {ExecutionContext} from '../../domain/audio/execution-context'

type AudioCandidateListener = (
  candidate: AudioCandidate,
  sender: chrome.runtime.MessageSender
) => void
type PlayerRegistration = {
  playerId: string
  durationMs: number
  context: ExecutionContext
}
type PlayerRegistrationListener = (
  registration: PlayerRegistration,
  sender: chrome.runtime.MessageSender
) => void

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
}
