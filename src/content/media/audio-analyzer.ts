import type {AudioCandidate} from '../../domain/audio/audio-candidate'

export async function resolveAudioDuration(candidate: AudioCandidate) {
  if (candidate.durationMs > 0) return candidate

  const durationMs = await readAudioDuration(candidate.url)
  return {...candidate, durationMs}
}

function readAudioDuration(url: string) {
  return new Promise<number>((resolve, reject) => {
    const audio = new Audio()
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Audio metadata timeout'))
    }, 5000)

    const cleanup = () => {
      window.clearTimeout(timeout)
      audio.remove()
    }

    audio.preload = 'metadata'
    audio.addEventListener(
      'loadedmetadata',
      () => {
        const durationMs = Number.isFinite(audio.duration)
          ? Math.round(audio.duration * 1000)
          : 0
        cleanup()
        resolve(durationMs)
      },
      {once: true}
    )
    audio.addEventListener(
      'error',
      () => {
        cleanup()
        reject(new Error('Audio metadata unavailable'))
      },
      {once: true}
    )
    audio.src = url
  })
}
