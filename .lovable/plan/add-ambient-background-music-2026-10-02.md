# Add ambient background music

## Overview
Add an original warm ambient soundscape that loops across the portfolio and attempts to begin when the site opens, with a subtle persistent control for visitors.

## Changes
1. Create a seamless, low-volume instrumental loop using warm synth pads and faint organic texture, with no vocals or third-party recording.
2. Add one sitewide audio player that remains mounted while visitors move between pages.
3. Attempt playback on opening; if the browser blocks audible autoplay, begin immediately after the visitor’s first interaction.
4. Add a small circular sound control with animated bars, accessible play/pause labeling, gentle fades, and saved preference.
5. Pause when the page is hidden and restore the prior playing state when it becomes visible.
6. Match both the orange glass and monochrome themes, and respect reduced-motion preferences.

## Validation
- Verify looping, play/pause, page navigation persistence, saved preference, and blocked-autoplay fallback.
- Check the control at desktop and mobile widths and confirm a clean preview build.

## Technical details
- Generate and store an original compressed audio asset locally in the project.
- Use one reusable React controller mounted beside the persistent site background.
- Keep volume intentionally low and avoid adding any external service or licensing dependency.
