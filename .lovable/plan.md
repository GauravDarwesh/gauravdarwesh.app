# Smooth existing sitewide motion

## What will change
- Keep the current theme, layout, content, controls, triggers, and animation behavior unchanged.
- Give existing page reveals, navigation, buttons, cards, overlays, tooltips, search states, and category transitions one consistent, natural easing system.
- Smooth the procedural wallpaper by stabilizing frame timing and softening its color-field movement without changing its appearance.
- Replace abrupt visual starts and stops with better acceleration and settling while preserving current intervals and interaction timing.
- Keep continuous motion such as the slideshow, marquee, progress bars, and rotating elements functionally identical.

## Technical details
- Add shared motion curves and durations as global CSS variables, then apply them to existing transitions.
- Refine only transition and animation declarations in the current components; no redesign or new effects.
- Use frame-time smoothing for the canvas wallpaper to avoid visible speed jumps after lag or tab changes.
- Preserve and expand reduced-motion safeguards.

## Verification
- Check GDx, Classic, Notions, and Visuals on desktop and mobile widths.
- Confirm navigation, overlays, search expansion, theme switching, category rotation, contribution tooltips, and slideshow behavior are unchanged.
- Confirm no console, runtime, type, or build errors.