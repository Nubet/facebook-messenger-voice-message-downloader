import {browserStorage} from '../infrastructure/browser/browser-storage'

export type ContentPipeline = {
  start(): void
  stop(): void
  removeInjectedUi(): void
}

export function startContentLifecycle(pipeline: ContentPipeline) {
  let disposed = false
  let running = false

  const applyEnabledState = (enabled: boolean) => {
    if (disposed) return

    if (enabled) {
      if (running) return

      running = true
      pipeline.start()
      return
    }

    if (running) pipeline.stop()
    pipeline.removeInjectedUi()
    running = false
  }

  const unsubscribe = browserStorage.subscribeToSettings((settings) => {
    applyEnabledState(settings.enabled)
  })

  void browserStorage
    .getSettings()
    .then((settings) => applyEnabledState(settings.enabled))
    .catch(() => applyEnabledState(false))

  return () => {
    disposed = true
    unsubscribe()

    if (running) pipeline.stop()
    pipeline.removeInjectedUi()
    running = false
  }
}
