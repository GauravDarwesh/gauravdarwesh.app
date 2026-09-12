# Fix SearchBar Type Errors

## Changes
- Align the voice-visual timeout ref with the browser timeout value returned by `window.setTimeout`.
- Type the inline mobile-width CSS custom property without weakening the remaining style checks.
- Wrap the voice-session stop callback so the click event is not passed as its boolean option.

## Verification
- Run the project TypeScript check.
- Confirm the latest preview build reports success.

## Scope
- Change only `src/components/SearchBar.tsx`.
