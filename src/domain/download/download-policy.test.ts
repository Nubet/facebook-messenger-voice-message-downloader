import {describe, expect, it} from 'vitest'
import {getDownloadFilename, isAllowedDownloadUrl} from './download-policy'

describe('download policy', () => {
  it('allows supported network and Blob URLs', () => {
    expect(isAllowedDownloadUrl('https://video.fbcdn.net/audio.mp4')).toBe(true)
    expect(isAllowedDownloadUrl('https://fbsbx.com/audio.mp4')).toBe(true)
    expect(isAllowedDownloadUrl('blob:https://www.facebook.com/id')).toBe(true)
  })

  it('rejects unsupported protocols and hosts', () => {
    expect(isAllowedDownloadUrl('http://video.fbcdn.net/audio.mp4')).toBe(false)
    expect(isAllowedDownloadUrl('https://example.com/audio.mp4')).toBe(false)
    expect(isAllowedDownloadUrl('javascript:alert(1)')).toBe(false)
  })

  it('creates a stable filename from mime type and timestamp', () => {
    expect(getDownloadFilename('audio/mpeg', 123)).toBe('voice-message-123.mp3')
    expect(getDownloadFilename(null, 456)).toBe('voice-message-456.mp4')
  })
})
