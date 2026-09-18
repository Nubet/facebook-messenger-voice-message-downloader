export async function downloadBlobUrl(url: string, filename: string) {
  if (!url.startsWith('blob:')) throw new Error('Blob URL is required')

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 100)
  })

  link.remove()
  URL.revokeObjectURL(url)
}
