import {facebookPlayerAdapter} from './facebook-player-adapter'
import {messengerPlayerAdapter} from './messenger-player-adapter'
import type {PlayerAdapter} from './player-adapter'

export function getPlayerAdapter(hostname: string): PlayerAdapter | null {
  if (hostname === 'www.facebook.com' || hostname.endsWith('.facebook.com')) {
    return facebookPlayerAdapter
  }

  if (hostname === 'www.messenger.com' || hostname.endsWith('.messenger.com')) {
    return messengerPlayerAdapter
  }

  return null
}
