# Facebook Messenger Voice Message Downloader

Browser extension for downloading voice messages from Facebook and Messenger directly from the conversation page

The extension detects supported voice-message players and adds a `Download` button next to them. It supports both regular network audio URLs and audio stored in page-owned `Blob` objects

## Features

- Works on `facebook.com` and `messenger.com`
- Adds a download action next to detected voice-message players
- Supports Facebook and Messenger player layouts through separate DOM adapters
- Handles network audio and page-owned Blob audio
- Keeps audio matching scoped to the current tab, frame, and page document
- Uses the browser's native download manager for network audio
- Lets the popup enable or disable processing
- 
## Supported Browsers

The project is configured to build for

- Google Chrome
- Mozilla Firefox

## How It Works

The extension has four runtime parts

- Popup: stores the user's enabled or disabled preference
- Content script: finds voice-message players and injects the Download button
- Main-world interceptor: observes audio Blobs created by page code
- Background: observes network audio, correlates players with audio candidates, validates URLs, and starts downloads

The content script does not download arbitrary URLs. A download is allowed only after an audio candidate has been matched to the selected player and passed the download URL policy

## Permissions

The manifest uses the following permissions

- `storage`: stores the enabled or disabled preference and short-lived correlation state
- `activeTab`: supports browser-tab context for the current page
- `webRequest`: observes eligible audio responses from supported media hosts
- `downloads`: starts downloads through the browser download manager

Host access is limited to the media hosts used by Facebook, Messenger, and related CDN responses

## Privacy

This extension does not collect any data. It has no analytics, tracking service, remote API, or user account system


## License

MIT
