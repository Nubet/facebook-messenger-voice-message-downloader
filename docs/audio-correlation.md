# Audio Correlation

`AudioCorrelationStore` connects two events that do not happen at the same time

- `player.registered`: the DOM scanner found a player
- `audio.detected`: the network or Blob path found audio

Neither event contains a direct DOM reference to the other one

## Match rules

The store compares

- `tabId`
- `frameId`
- `documentId`
- duration difference up to `1500 ms`
- closest detection time

## Execution context

Every player and candidate carries an `ExecutionContext`

```ts
type ExecutionContext = {
  tabId: number | null
  frameId: number
  documentId?: string
}
```

This prevents audio from one tab, iframe, or page document from matching another player

The content script starts with a partial context. The background fills missing values from the message sender

```text
content context: tabId = null, frameId = 0
background sender: tabId = 12, frameId = 0, documentId = doc-1
stored context: tabId = 12, frameId = 0, documentId = doc-1
```

## Event order

The player can be detected first

```text
registerPlayer -> registerAudio -> ready candidate
```

Audio can also arrive first

```text
registerAudio -> registerPlayer -> ready candidate
```

The store keeps both pending collections until one event can match the other

## Candidate lifecycle

```text
players or audio
  -> matched
  -> readyCandidates
  -> takeCandidate
  -> removed
```

The download request consumes a candidate once

```ts
const candidate = await store.takeCandidate(playerId, context)
```

The store also applies a `30 s` TTL, a maximum of `200` pending records, and cleanup before reads and writes

Network records can be restored from `chrome.storage.session`

Blob URLs are not persisted because they are tied to the page document
