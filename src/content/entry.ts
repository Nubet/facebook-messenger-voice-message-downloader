import {
  startContentLifecycle,
  type ContentPipeline,
} from './content-lifecycle'
import {getPlayerAdapter} from './dom/get-player-adapter'
import {BlobAudioSource} from './media/blob-audio-source'
import {downloadBlobUrl} from './media/blob-downloader'
import {downloadAsWav} from './media/audio-converter'
import {resolveAudioDuration} from './media/audio-analyzer'
import {PlayerScanner} from './player-scanner'
import {browserMessaging} from '../infrastructure/browser/browser-messaging'
import {browserStorage} from '../infrastructure/browser/browser-storage'
import type {ExecutionContext} from '../domain/audio/execution-context'
import {injectDownloadButton} from './ui/download-button'
import {
  diagnosticError,
  diagnosticInfo,
  setDiagnosticsEnabled,
} from '../shared/diagnostics'

let playerSequence = 0

export default function initial() {
  const adapter = getPlayerAdapter(location.hostname)
  if (!adapter) return () => {}

  const scanner = new PlayerScanner(adapter, (player) => {
    const context: ExecutionContext = {tabId: null, frameId: 0}
    const playerId = `player-${Date.now()}-${playerSequence++}`

    void browserMessaging.sendPlayerRegistration({
      playerId,
      durationMs: player.durationMs,
      context,
    })

    return injectDownloadButton(player.injectionTarget, () => {
      return browserMessaging
        .sendPlayerRegistration({playerId, durationMs: player.durationMs, context})
        .catch((error: unknown) => {
          diagnosticError('download.player-registration.failed', error, {playerId})
        })
        .then(() => browserStorage.getSettings())
        .then((settings) => {
          setDiagnosticsEnabled(settings.diagnostics)
          diagnosticInfo('download.button.clicked', {playerId, context})
          diagnosticInfo('download.player-registration.refreshed', {
            playerId,
            durationMs: player.durationMs,
          })
          diagnosticInfo('download.settings', {playerId, downloadFormat: settings.downloadFormat})
          return browserMessaging.requestDownload(playerId, context, settings.downloadFormat)
        })
        .catch((error: unknown) => {
          diagnosticError('download.settings.failed', error, {playerId})
          return browserMessaging.requestDownload(playerId, context, 'original')
        })
        .then((result) => {
          diagnosticInfo('download.result', {playerId, result})
          if (!result.success) throw new Error(result.error ?? 'Download failed.')
        })
    })
  })
  const blobAudioSource = new BlobAudioSource((candidate) => {
    browserMessaging.sendAudioCandidateToBackground(candidate)
  })
  let unsubscribeNetworkCandidates = () => {}
  let unsubscribeBlobDownloads = () => {}
  let unsubscribeConvertedDownloads = () => {}

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
      unsubscribeBlobDownloads = browserMessaging.subscribeToBlobDownloads(
        (message) => {
          return downloadBlobUrl(message.url, message.filename)
            .then(() => ({success: true}))
            .catch((error: unknown) => {
              diagnosticError('download.blob.failed', error, {url: message.url})
              return {success: false, error: error instanceof Error ? error.message : 'Download failed.'}
            })
        }
      )
      unsubscribeConvertedDownloads = browserMessaging.subscribeToConvertedDownloads(
        (message) => {
          return downloadAsWav(message.url, message.filename)
            .then(() => ({success: true}))
            .catch((error: unknown) => {
              diagnosticError('download.wav.failed', error, {url: message.url, filename: message.filename})
              return {success: false, error: error instanceof Error ? error.message : 'WAV conversion failed.'}
            })
        }
      )
    },
    stop: () => {
      scanner.stop()
      blobAudioSource.stop()
      unsubscribeNetworkCandidates()
      unsubscribeNetworkCandidates = () => {}
      unsubscribeBlobDownloads()
      unsubscribeBlobDownloads = () => {}
      unsubscribeConvertedDownloads()
      unsubscribeConvertedDownloads = () => {}
    },
    removeInjectedUi: () => scanner.removeInjectedUi(),
  }

  return startContentLifecycle(pipeline)
}
