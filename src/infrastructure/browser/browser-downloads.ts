import {isAllowedDownloadUrl} from '../../domain/download/download-policy'

export const browserDownloads = {
  async download(url: string, filename: string) {
    if (!isAllowedDownloadUrl(url) || url.startsWith('blob:')) {
      return Promise.reject(new Error('Download URL is not allowed'))
    }

    const downloadId = await new Promise<number>((resolve, reject) => {
      chrome.downloads.download({url, filename, saveAs: false}, (downloadId) => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }

        resolve(downloadId)
      })
    })

    await waitForDownload(downloadId)
  },
}

function waitForDownload(downloadId: number) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.downloads.onChanged.removeListener(handleChange)
      reject(new Error('Download timed out.'))
    }, 30_000)

    const finish = (error?: Error) => {
      clearTimeout(timeout)
      chrome.downloads.onChanged.removeListener(handleChange)
      error ? reject(error) : resolve()
    }

    const handleChange = (delta: {
      id: number
      state?: {current?: string}
      error?: {current?: string}
    }) => {
      if (delta.id !== downloadId || !delta.state) return

      if (delta.state.current === 'complete') finish()
      if (delta.state.current === 'interrupted') {
        finish(new Error(delta.error?.current ?? 'Download was interrupted.'))
      }
    }

    chrome.downloads.onChanged.addListener(handleChange)
  })
}
