import type {DetectedPlayer} from '../domain/player/detected-player'
import type {PlayerAdapter} from './dom/player-adapter'

export type PlayerDetectedHandler = (player: DetectedPlayer) => void

export class PlayerScanner {
  private enabled = false
  private pendingFrame: number | null = null
  private observer: MutationObserver | null = null
  private readonly detectedRoots = new Set<HTMLElement>()

  constructor(
    private readonly adapter: PlayerAdapter,
    private readonly onPlayerDetected: PlayerDetectedHandler = () => {}
  ) {}

  start() {
    if (this.enabled) return

    this.enabled = true
    this.scan(document.body)
    this.observeDom()
  }

  stop() {
    if (!this.enabled) return

    this.enabled = false
    this.observer?.disconnect()
    this.observer = null

    if (this.pendingFrame !== null) {
      window.cancelAnimationFrame(this.pendingFrame)
      this.pendingFrame = null
    }

    this.detectedRoots.clear()
  }

  removeInjectedUi() {
    // The injector is added in the player UI phase.
  }

  private scan(root: ParentNode) {
    if (!this.enabled) return

    this.adapter.findPlayers(root).forEach((playerRoot) => {
      if (this.detectedRoots.has(playerRoot)) return

      this.detectedRoots.add(playerRoot)
      this.onPlayerDetected(this.adapter.toDetectedPlayer(playerRoot))
    })
  }

  private observeDom() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.enabled || this.pendingFrame !== null) return

      const addedElements = mutations.flatMap((mutation) =>
        [...mutation.addedNodes].filter(
          (node): node is Element => node instanceof Element
        )
      )

      if (addedElements.length === 0) return

      this.pendingFrame = window.requestAnimationFrame(() => {
        this.pendingFrame = null
        addedElements.forEach((element) => this.scan(element))
      })
    })

    this.observer.observe(document.body, {childList: true, subtree: true})
  }
}
