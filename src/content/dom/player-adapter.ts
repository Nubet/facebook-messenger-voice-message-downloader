import type {DetectedPlayer} from '../../domain/player/detected-player'

export type PlayerAdapter = {
  findPlayers(root: ParentNode): HTMLElement[]
  findPlayerRoot(element: Element): HTMLElement | null
  readDuration(player: HTMLElement): number
  getInjectionTarget(player: HTMLElement): HTMLElement
  toDetectedPlayer(player: HTMLElement): DetectedPlayer
}

type PlayerSelectors = {
  scrubber: string
  playButton: string
  timer: string
  excludedAncestor: string
}

export function createPlayerAdapter(
  selectors: PlayerSelectors
): PlayerAdapter {
  return {
    findPlayers(root) {
      const scrubbers: Element[] = []

      if (root instanceof Element && root.matches(selectors.scrubber)) {
        scrubbers.push(root)
      }

      scrubbers.push(...root.querySelectorAll(selectors.scrubber))

      const players = new Set<HTMLElement>()
      scrubbers.forEach((scrubber) => {
        const player = this.findPlayerRoot(scrubber)
        if (player) players.add(player)
      })

      return [...players]
    },

    findPlayerRoot(element) {
      let candidate = element.parentElement

      while (candidate && candidate !== document.body) {
        const hasPlayButton = Boolean(
          candidate.querySelector(selectors.playButton)
        )
        const hasTimer = Boolean(candidate.querySelector(selectors.timer))
        const isExcluded = Boolean(
          candidate.closest(selectors.excludedAncestor)
        )

        if (hasPlayButton && hasTimer && !isExcluded) return candidate
        candidate = candidate.parentElement
      }

      return null
    },

    readDuration(player) {
      const scrubber = player.querySelector(selectors.scrubber)
      const ariaMax = Number.parseFloat(
        scrubber?.getAttribute('aria-valuemax') ?? ''
      )

      if (Number.isFinite(ariaMax) && ariaMax > 0) return ariaMax * 1000

      const timerText = player.querySelector(selectors.timer)?.textContent
      return parseDurationMs(timerText)
    },

    getInjectionTarget(player) {
      return player.parentElement ?? player
    },

    toDetectedPlayer(player) {
      return {
        root: player,
        durationMs: this.readDuration(player),
        injectionTarget: this.getInjectionTarget(player),
      }
    },
  }
}

function parseDurationMs(value: string | null | undefined) {
  if (!value) return 0

  const parts = value.trim().split(':').map(Number)
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
    return 0
  }

  return parts.reduce((total, part) => total * 60 + part, 0) * 1000
}
