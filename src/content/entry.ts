import {
  startContentLifecycle,
  type ContentPipeline,
} from './content-lifecycle'

export default function initial() {
  const pipeline: ContentPipeline = {
    start() {},
    stop() {},
    removeInjectedUi() {},
  }

  return startContentLifecycle(pipeline)
}
