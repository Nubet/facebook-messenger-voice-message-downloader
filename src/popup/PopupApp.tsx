import {useSyncExternalStore} from 'react'
import {
  getPopupSnapshot,
  setDownloadFormat,
  setEnabled,
  subscribeToPopupState,
} from './popup-state'

export default function PopupApp() {
  return (
    <PopupContent />
  )
}

function PopupContent() {
  const snapshot = useSyncExternalStore(
    subscribeToPopupState,
    getPopupSnapshot,
    getPopupSnapshot
  )

  const pageStatus = snapshot.isSupportedPage
    ? `Ready on ${snapshot.pageName}`
    : 'Not supported on this page'
  const extensionVersion = chrome.runtime.getManifest().version

  return (
    <main className="popup" aria-labelledby="popup-title">
      <header className="popup_header">
        <img
          src="../images/icon-transparent-128.png"
          alt=""
          aria-hidden="true"
        />
        <div>
          <h1 id="popup-title">Voice Message Downloader</h1>
          <p>{pageStatus}</p>
        </div>
      </header>

      <label className="toggle_row">
        <span>
          <strong>Enabled</strong>
          <small>Allow voice message detection</small>
        </span>
        <input
          type="checkbox"
          checked={snapshot.enabled}
          disabled={snapshot.status === 'loading'}
          onChange={(event) => void setEnabled(event.target.checked)}
        />
      </label>

      <label className="select_row">
        <span>
          <strong>Download format</strong>
          <small>WAV / OGG</small>
        </span>
        <select
          value={snapshot.downloadFormat}
          disabled={snapshot.status === 'loading'}
          onChange={(event) =>
            void setDownloadFormat(event.target.value as 'original' | 'wav')
          }
        >
          <option value="original">OGG</option>
          <option value="wav">WAV</option>
        </select>
      </label>

      {snapshot.errorMessage ? (
        <p className="error_message" role="alert">
          {snapshot.errorMessage}
        </p>
      ) : null}

      <footer className="popup_footer">
        <span>
          Made by{' '}
          <a href="https://norbertfila.com" target="_blank" rel="noreferrer">
            Norbert Fila
          </a>
        </span>
        <span>v{extensionVersion}</span>
        <a
          href="https://github.com/Nubet/facebook-messenger-voice-message-downloader"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </main>
  )
}
