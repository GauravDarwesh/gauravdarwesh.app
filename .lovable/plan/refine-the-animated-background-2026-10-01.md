# Refine the animated background

## Goal
Evolve the current bright tiled wallpaper into a slower, deeper ember field while preserving the existing orange identity and leaving monochrome mode unchanged.

## Changes
- Add a deep burgundy foundation beneath the animation so darker regions feel intentional rather than empty.
- Retune the procedural color field with broader, slower areas of ember red, burnt orange, amber, and near-black.
- Add a soft page-specific illumination layer that supports the main content instead of competing with it.
- Replace the aggressive texture treatment with finer film grain, a restrained edge vignette, and a faint structural texture.
- Adapt brightness and movement by page: central warmth on GDx, calmer edges on Classic, reduced saturation on Notions, and a darker treatment on Visuals.
- Add a subtle delayed pointer influence on desktop only, capped to a small movement range.
- Reduce texture and processing on smaller screens and disable interaction when reduced motion is preferred.
- Keep monochrome mode white, static, and free of animation or blur.

## Technical details
- Keep the background mounted persistently while moving it inside the router boundary so it can read the current page without remounting.
- Pass the current page into the procedural canvas and expose semantic background tokens for the foundation, illumination, vignette, and texture layers.
- Use requestAnimationFrame interpolation for the delayed pointer response and retain visibility-based animation pausing.
- Verify the result on GDx, Classic, Notions, and Visuals at desktop and mobile sizes, including monochrome and reduced-motion states.
