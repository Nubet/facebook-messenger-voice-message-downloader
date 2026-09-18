# Downloads

The user sees one Download button, but the download path depends on where the audio came from

The background owns the download decision because it has the correlation store and the browser download permission

## Request flow

1. The user clicks `Download`
2. Content sends `download.requested` with `playerId` and context
3. Background takes the ready candidate
4. Background validates the URL
5. Background generates a filename
6. Background starts a network download or sends a Blob download message back to the tab

If no candidate is ready, the request is ignored. The button does not invent a URL and does not download arbitrary page data

## URL policy

Allowed network hosts are

- `*.fbcdn.net`
- `*.fbsbx.com`
- `*.cdninstagram.com`

Blob URLs are allowed only for the content-side Blob path

Other protocols and hosts are rejected

The policy is checked in `handleDownloadRequest` and again in `browserDownloads.download`

The second check protects the browser API boundary if another caller uses the adapter later

## Network download

Network candidates use `chrome.downloads`

```ts
const filename = getDownloadFilename(candidate.mimeType)
await browserDownloads.download(candidate.url, filename)
```

## Blob download

Blob candidates are sent back to the content tab because the Blob URL belongs to that document

```ts
link.href = blobUrl
link.download = filename
link.click()
URL.revokeObjectURL(blobUrl)
```

The content script removes the temporary link and revokes the URL after the browser receives the request

## Filename

Filenames use the MIME type when it is known

```text
voice-message-<timestamp>.mp3
voice-message-<timestamp>.webm
```

Unknown or missing MIME types use a safe fallback extension
