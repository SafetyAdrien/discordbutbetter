

# Fix: "Rendered more hooks than during the previous render" in UserProfilePopup

## Root Cause

In `src/components/profile/UserProfilePopup.tsx`, there is an early return at **line 130** (`if (!user) return null;`) that occurs **before** the `useQuery` hook at **line 146**. This violates React's rules of hooks: hooks must always be called in the same order on every render.

- When `user` is `null`: hooks at lines 118-129 run, then the component returns early -- the `useQuery` at line 146 never runs.
- When `user` becomes non-null (e.g., after a role is added and a re-render is triggered): hooks at lines 118-129 run, then `useQuery` at line 146 also runs -- **one more hook than last time**.

This is why removing a role works (doesn't change the hook count) but adding one crashes.

## Fix

Move the early return (`if (!user) return null;`) to **after** all hooks have been called. The `useQuery` at line 146 already has `enabled: !!serverId && !!memberId`, so it safely no-ops when data isn't available. We just need to ensure the hook always executes.

### File: `src/components/profile/UserProfilePopup.tsx`

1. **Remove** the early return at line 130 (`if (!user) return null;`)
2. **Move** it to after line 156 (after the `useQuery` call and any other hooks)
3. This ensures all hooks are always called regardless of `user` being null or not

### Technical Detail

```
// BEFORE (broken):
const { data: friends } = useFriends();           // hook 5
const { data: allRoles } = useServerRoles(...);   // hook 6
...
if (!user) return null;                            // <-- EARLY RETURN HERE
...
const { data: reactiveRoles } = useQuery(...);     // hook 7 -- SKIPPED when user is null!

// AFTER (fixed):
const { data: friends } = useFriends();
const { data: allRoles } = useServerRoles(...);
...
const { data: reactiveRoles } = useQuery(...);     // hook 7 -- always runs
if (!user) return null;                            // moved after all hooks
```

No other files need changes. This is a one-line move.

