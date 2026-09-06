# Add a sitewide monochrome pull-tab theme

## Overview
Add a small bookmark-style pull tab at the top-left of the GDx page. Pulling or clicking it switches all four main pages between the existing orange glass style and a persistent minimal black-and-white style.

## Changes

1. **Theme state and persistence**
   - Add a shared theme provider at the app root.
   - Store the visitor’s choice locally so it remains active while moving between GDx, Classic, Notions, and Visuals and after reopening the site.
   - Apply the mode through one root attribute so every page changes together.

2. **Pull-tab interaction**
   - Add a slim bookmark tab only on the GDx page, fixed at the top-left.
   - Support pointer dragging downward/upward as well as click/keyboard activation.
   - Animate the tab and a brief page-level color transition; respect reduced-motion preferences.
   - Keep it clear of navigation and existing search interactions.

3. **Minimal black-and-white appearance**
   - Replace the orange image with a clean white background in minimal mode.
   - Make text, icons, outlines, controls, tags, suggestion bubbles, cards, and modal surfaces black/white with crisp solid borders.
   - Remove backdrop blur, translucent glass, colored glow, and decorative shadows in minimal mode.
   - Preserve photography/video content on Visuals while simplifying its frame and controls.
   - Leave the existing colorful glass mode unchanged.

4. **Validation**
   - Check all four pages at desktop and mobile widths.
   - Verify theme persistence, pull/click/keyboard behavior, readable contrast, overlays, and the current build status.

## Technical details
- Add a small React context/provider and a focused pull-tab component.
- Use semantic CSS overrides under a root `data-theme="minimal"` attribute to avoid invasive edits to the large SearchBar component.
- Add stable theme hook classes only where global selectors cannot safely target an element.
