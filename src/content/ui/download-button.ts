export type DownloadButtonCleanup = () => void

export function injectDownloadButton(
  target: HTMLElement,
  onDownload: () => Promise<void>
): DownloadButtonCleanup {
  const button = document.createElement('button')
  let resetTimer: number | null = null

  button.type = 'button'
  button.textContent = 'Download'
  button.setAttribute('aria-label', 'Download voice message')
  button.style.cssText = [
    'align-items:center',
    'background:#1f2937',
    'border:0',
    'border-radius:999px',
    'box-sizing:border-box',
    'color:#fff',
    'cursor:pointer',
    'display:inline-flex',
    'font:600 12px/1 system-ui,sans-serif',
    'margin:6px 0 0 6px',
    'min-height:28px',
    'padding:0 10px',
    'transition:background .15s ease,opacity .15s ease',
    'vertical-align:middle',
  ].join(';')

  const handleClick = () => {
    if (button.disabled) return

    button.disabled = true
    button.textContent = 'Downloading...'
    button.style.cursor = 'default'
    button.style.opacity = '0.65'

    void onDownload()
      .then(() => {
        button.textContent = 'Downloaded'
        button.style.background = '#16803c'
      })
      .catch((error: unknown) => {
        button.textContent = 'Download failed'
        button.title = error instanceof Error ? error.message : 'Download failed.'
        button.style.background = '#b42318'
      })
      .finally(() => {
        resetTimer = window.setTimeout(() => {
          button.style.background = '#1f2937'
          button.title = ''
          button.disabled = false
          button.textContent = 'Download'
          button.style.cursor = 'pointer'
          button.style.opacity = '1'
          resetTimer = null
        }, 2500)
      })

  }

  button.addEventListener('click', handleClick)
  target.appendChild(button)

  return () => {
    button.removeEventListener('click', handleClick)
    if (resetTimer !== null) window.clearTimeout(resetTimer)
    button.remove()
  }
}
