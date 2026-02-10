

## Add Sort By Button to Blog Page

### Overview
Add a "Sort by" button on the right side of the filter bar, visually identical to the existing "Filter" button. When clicked, it expands a dropdown toward the left (mirroring the filter's rightward expansion) with options to sort posts by date (Newer/Older).

### Changes (single file: `src/pages/Blog.tsx`)

1. **New state**: Add `sortOrder` state (`"newer"` | `"older"`, default `"newer"`), plus `sortOpen` and `isSortAnimating` booleans to mirror the filter's open/close animation pattern.

2. **Sort button**: Place a "Sort by" button on the far right of the filter bar row using `ml-auto` to push it to the opposite end from "Filter". Styled identically -- same `h-9 px-4 text-[12px] rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20` classes.

3. **Sort dropdown**: When open, render:
   - A backdrop overlay (same as filter's `bg-black/40 backdrop-blur-sm` with fade animation)
   - A dropdown panel anchored to the right (`right-0`) with the same glassmorphism style (`bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20`), containing two buttons: "Newer" and "Older"
   - Uses the same scale/opacity/translate animation pattern as the filter dropdown
   - The sort button gets `z-40` when open (same as filter button behavior)

4. **Sort logic**: After filtering by tags, sort `filteredPosts` by date -- parse the date strings and sort descending for "newer" (default) or ascending for "older".

### Technical Details

- The filter bar container already uses `flex-wrap justify-start`. The sort button will use `ml-auto` to align right.
- Both dropdowns share the same overlay; if one is open, clicking the overlay closes it. Opening one will not interfere with the other since they use independent state.
- Date parsing uses `new Date(post.date)` which handles the existing format ("August 8, 2020", "January 2, 2021", etc.).
- The active sort option will be highlighted with `bg-white/30 border-white/30` (same as active filter tags).

