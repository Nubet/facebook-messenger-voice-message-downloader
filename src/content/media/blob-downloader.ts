export async function downloadBlobUrl(url: string, filename: string) {
  if (!url.startsWith('blob:')) throw new Error('Blob URL is required')

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)

  try {
    link.click()

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 100)
    })
  } finally {
    link.remove()
    // The URL belongs to the audio candidate and may be reused for WAV conversion
  }
}
