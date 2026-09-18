export type NetworkResponse = {
  url: string
  method: string
  statusCode?: number
  responseHeaders?: Array<{name: string; value?: string}>
  tabId: number
  frameId: number
  documentId?: string
}

type NetworkResponseListener = (response: NetworkResponse) => void

const AUDIO_URL_PATTERNS = [
  '*://*.fbcdn.net/*',
  '*://*.fbsbx.com/*',
  '*://*.cdninstagram.com/*',
]

export const browserNetwork = {
  subscribeToResponses(listener: NetworkResponseListener) {
    const handleResponse = (details: chrome.webRequest.WebResponseHeadersDetails) => {
      const documentId = (
        details as chrome.webRequest.WebResponseHeadersDetails & {
          documentId?: string
        }
      ).documentId

      listener({
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        responseHeaders: details.responseHeaders,
        tabId: details.tabId,
        frameId: details.frameId,
        documentId,
      })
    }

    chrome.webRequest.onHeadersReceived.addListener(
      handleResponse,
      {urls: AUDIO_URL_PATTERNS},
      ['responseHeaders']
    )

    return () => chrome.webRequest.onHeadersReceived.removeListener(handleResponse)
  },
}
