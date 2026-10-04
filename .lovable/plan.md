# Add independent minimal-theme music

## Overview
Create a separate seamless minimal-piano soundtrack for the black-and-white theme while preserving the existing warm ambient track for the glass theme.

## Changes
1. Generate an original low-volume felt-piano loop with sparse notes, soft room tone, no vocals, and no third-party recording.
2. Keep both theme soundtracks mounted sitewide so navigation never restarts playback.
3. Crossfade smoothly between the warm ambient and piano tracks whenever the theme changes.
4. Preserve the current autoplay attempt, first-interaction fallback, hidden-tab pause/resume behavior, and invisible controls.

## Validation
- Confirm each theme plays its own track and changing themes crossfades without an abrupt cut.
- Confirm looping and navigation remain uninterrupted.
- Confirm the preview builds cleanly.

## Technical details
- Store the generated piano loop locally as a compressed audio asset.
- Continue mounting the audio controller outside the router.
