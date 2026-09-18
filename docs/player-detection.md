# Player Detection

Facebook and Messenger use different DOM structures and can change their markup independently

The scanner owns timing and deduplication. A site adapter owns selectors and DOM interpretation

## Adapter contract

```ts
type PlayerAdapter = {
  findPlayers(root: ParentNode): HTMLElement[]
  findPlayerRoot(element: Element): HTMLElement | null
  readDuration(player: HTMLElement): number
  getInjectionTarget(player: HTMLElement): HTMLElement
  toDetectedPlayer(player: HTMLElement): DetectedPlayer
}
```

The current adapters use a scrubber as the first marker. They walk up the DOM until they find a container with

- a play button
- a timer
- no excluded ancestor

That container becomes the player root

## Scanner flow

`PlayerScanner` watches `document.body` with `MutationObserver`

1. Scan the current document when the pipeline starts
2. Scan only added DOM subtrees after mutations
3. Find scrubbers in the page
4. Resolve the parent player root
5. Read duration from `aria-valuemax` or timer text
6. Create a local `playerId`
7. Register the player in the background
8. Inject one `Download` button

Player roots are stored in a `Set` to avoid duplicate detection

## Player identity

The DOM element is not sent through runtime messaging. It is local to the content script

The content script creates an ID and keeps it in the button callback

```ts
const playerId = `player-${Date.now()}-${sequence++}`
```

The later button click can therefore refer to the same player record in the background