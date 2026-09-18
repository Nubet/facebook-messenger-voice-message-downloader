import {isAllowedDownloadUrl} from '../../domain/download/download-policy'

export const browserDownloads = {
  download(url: string, filename: string) {
    if (!isAllowedDownloadUrl(url) || url.startsWith('blob:')) {
      return Promise.reject(new Error('Download URL is not allowed'))
    }

    return new Promise<number>((resolve, reject) => {
      chrome.downloads.download({url, filename, saveAs: false}, (downloadId) => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }

        resolve(downloadId)
      })
    })
  },
}
