# Architecture Decisions

- Keep the site wallpaper mounted inside `BrowserRouter` and derive its atmosphere from `useLocation`; this preserves one continuous canvas while allowing route-specific art direction.