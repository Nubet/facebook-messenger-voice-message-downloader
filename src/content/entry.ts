import {
  startContentLifecycle,
  type ContentPipeline,
} from './content-lifecycle'
import {getPlayerAdapter} from './dom/get-player-adapter'
import {PlayerScanner} from './player-scanner'

export default function initial() {
  const adapter = getPlayerAdapter(location.hostname)
  if (!adapter) return () => {}

  const scanner = new PlayerScanner(adapter)

  const pipeline: ContentPipeline = {
    start: () => scanner.start(),
    stop: () => scanner.stop(),
    removeInjectedUi: () => scanner.removeInjectedUi(),
  }

  return startContentLifecycle(pipeline)
}
