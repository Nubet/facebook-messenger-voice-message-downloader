console.log('[Voice Message Downloader] Background entry loaded')

import {NetworkAudioSource} from './media/network-audio-source'
import {browserMessaging} from '../infrastructure/browser/browser-messaging'
import {browserStorage} from '../infrastructure/browser/browser-storage'

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

browserMessaging.subscribeToAudioCandidates(() => {
  // Audio candidates are correlated and persisted in the next phase.
})
