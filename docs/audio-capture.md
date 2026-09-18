# Audio Capture

The player UI and the audio resource are separate things

The page may create a player before the browser requests its audio. It may also create audio as a Blob instead of exposing a normal network URL

The extension has two capture paths

## Network audio

`NetworkAudioSource` listens to response events and accepts only

- `GET` requests
- status `200` or `206`
- known audio or video content types
- files between `512 B` and `25 MB`

The first candidate has no duration

```ts
{
  url,
  durationMs: 0,
  mimeType,
  source: 'network',
  context,
}
```

The content script receives this candidate and loads audio metadata from the URL

It sends the candidate again with the duration because response headers usually do not contain the duration needed for correlation

## Blob audio

The main-world interceptor wraps `URL.createObjectURL`

It captures only audio Blobs while capture is enabled

1. Call the original `URL.createObjectURL`
2. Create an `Audio` object for metadata
3. Read the Blob into an `ArrayBuffer`
4. Send `audio.blob-detected` with `window.postMessage`

The isolated content script receives the event, creates a candidate, and sends `audio.detected` to the background

```text
main world: URL.createObjectURL(audio Blob)
  -> window.postMessage(audio.blob-detected)
isolated content script
  -> audio.detected
background
```

The interceptor restores the original `URL.createObjectURL` when it is disposed

## Why Blob handling stays in the tab

A Blob URL belongs to the document that created it. The background cannot use it as a normal network URL

The background sends `download.blob` back to the tab. The content script clicks a temporary anchor and revokes the URL afterward
