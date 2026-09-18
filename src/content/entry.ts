import {
  startContentLifecycle,
  type ContentPipeline,
} from './content-lifecycle'
import {getPlayerAdapter} from './dom/get-player-adapter'
import {BlobAudioSource} from './media/blob-audio-source'
import {resolveAudioDuration} from './media/audio-analyzer'
import {PlayerScanner} from './player-scanner'
import {browserMessaging} from '../infrastructure/browser/browser-messaging'

export default function initial() {
  const adapter = getPlayerAdapter(location.hostname)
  if (!adapter) return () => {}

  const scanner = new PlayerScanner(adapter)
  const blobAudioSource = new BlobAudioSource((candidate) => {
    browserMessaging.sendAudioCandidateToBackground(candidate)
  })
  let unsubscribeNetworkCandidates = () => {}

  const pipeline: ContentPipeline = {
    start: () => {
      scanner.start()
      blobAudioSource.start()
      unsubscribeNetworkCandidates = browserMessaging.subscribeToAudioCandidates(
        (candidate) => {
          if (candidate.source !== 'network' || candidate.durationMs > 0) return

          void resolveAudioDuration(candidate)
            .then((resolvedCandidate) => {
              browserMessaging.sendAudioCandidateToBackground(resolvedCandidate)
            })
            .catch(() => {})
        }
      )
    },
    stop: () => {
      scanner.stop()
      blobAudioSource.stop()
      unsubscribeNetworkCandidates()
      unsubscribeNetworkCandidates = () => {}
    },
    removeInjectedUi: () => scanner.removeInjectedUi(),
  }

  return startContentLifecycle(pipeline)
}
