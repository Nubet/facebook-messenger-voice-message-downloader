import {createPlayerAdapter} from './player-adapter'

export const facebookPlayerAdapter = createPlayerAdapter({
  scrubber: '[role="slider"][aria-valuemin="0"][aria-valuemax]',
  playButton: '[role="button"][style*="background-color: transparent"]',
  timer: '[role="timer"]',
  excludedAncestor: '[role="complementary"]',
})
