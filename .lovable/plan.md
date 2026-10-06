# Restore phone soundtrack playback

## Overview
Replace the phone-fragile decoded audio setup with one persistent browser audio player that starts directly inside the visitor's first touch and remains authorized while themes change.

## Changes
1. Use one hidden, sitewide audio player for both soundtracks instead of decoded Web Audio buffers.
2. Attempt autoplay on page load, then retry synchronously on the earliest touch, pointer, click, or keyboard interaction when a browser blocks it.
3. Keep the player mounted across navigation and reuse the same unlocked player when switching themes.
4. Fade out, change the soundtrack, and fade back in so theme switching stays smooth.
5. Preserve the current ambient loudness, looping, hidden-tab pause/resume, and invisible controls.

## Validation
- Confirm the soundtrack request succeeds and playback starts after one touch when autoplay is restricted.
- Confirm both theme directions replace the soundtrack on the same player.
- Confirm navigation does not remount the player and the preview builds cleanly.

## Technical details
- Avoid asynchronous decoding in the activation path because mobile Safari and Chrome can discard user activation before playback starts.
- Call the persistent media element's `play()` directly in the original input event.
