import type {AudioCandidate} from '../../domain/audio/audio-candidate'
import {
  isAudioDetectedMessage,
  type AudioDetectedMessage,
} from '../../messaging/audio-messages'

type AudioCandidateListener = (
  candidate: AudioCandidate,
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
}
