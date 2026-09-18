import {useSyncExternalStore} from 'react'
import {
  getPopupSnapshot,
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

      {snapshot.errorMessage ? (
        <p className="error_message" role="alert">
          {snapshot.errorMessage}
        </p>
      ) : null}
    </main>
  )
}
