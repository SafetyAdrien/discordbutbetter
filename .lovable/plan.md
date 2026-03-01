

# Fix: Server banner cut off by action icons (Desktop)

## Problem
The server header uses a flex row where the server name button (`flex-1`) contains the banner image with `absolute inset-0`, and the action icons sit as a separate flex child next to it. This means the banner image only fills the button area, not the full header width -- the icons visually "cut" the banner.

## Solution
Move the banner image out of the button and into the parent container so it spans the full header width. The server name and action icons will then overlay on top of the banner instead of sitting beside it.

### Changes in `src/components/layout/ChannelList.tsx`

1. **Make the header row `relative overflow-hidden`** (line 1181) so it can host the banner as an absolute background
2. **Move the banner `<img>` and gradient overlay** from inside the PopoverTrigger button (lines 1189-1193) up to the header row level, as a background layer spanning the full width
3. **Remove `overflow-hidden` and banner-related code from the button** -- it becomes a simple transparent overlay trigger
4. **Keep the action icons unchanged** -- they naturally sit on top of the full-width banner

### Visual result

```text
Before:
[  Banner (button only)  ] [Icons (no banner)]

After:
[        Banner (full width background)       ]
[  Server Name (overlay)  ] [Icons (overlay)  ]
```

Only one file is modified: `src/components/layout/ChannelList.tsx`.

