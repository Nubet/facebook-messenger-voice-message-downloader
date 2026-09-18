export type ActiveTab = {
  url?: string
}

export const browserTabs = {
  getActiveTab(): Promise<ActiveTab | undefined> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }

        resolve(tabs[0])
      })
    })
  },
}
