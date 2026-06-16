# Update `RepliedLine` — alignment + component split

## Problems
1. The L-shaped connector (vertical bar) sits to the right of where it should — it is not vertically aligned with the **horizontal center of the parent message avatar**.
2. The connector (`ReplyLine`) and the cited-message content (`RepliedContent`) are rendered inside a single `<div>`, so they cannot be selected/styled/targeted independently.

## Goals
- Vertical bar of the L is centered exactly above the center of the parent user avatar (40px avatar at `pl-[21px] -ml-[11px] gap-3` → avatar center = **30px** from the inner content edge).
- The L's horizontal arm meets the mini-avatar of the cited reply row (same as today).
- `ReplyLine` (SVG L-connector) and `RepliedContent` (mini-avatar + author + preview/attachment chip) become two sibling components, both exported, individually selectable in the DOM.

## Files

### `src/components/chat/RepliedLine.tsx` (refactor)

Split the current single component into three exports living in the same file:

```text
RepliedLine            ← wrapper (group/replied, mb-0.5, button|div)
├─ ReplyLine           ← only the absolute-positioned <svg> L-connector
└─ RepliedContent      ← mini-avatar + author name + role badge + body preview
```

Layout rules inside the wrapper:
- Wrapper: `relative flex items-center gap-1.5 min-h-[18px] overflow-visible` with `paddingLeft: indent`.
- `ReplyLine`: keeps its current absolute positioning, but `connectorLeft` is now derived to **center on the parent avatar**:
  - New prop `avatarCenter` (px from wrapper's outer edge, default `30`) so callers using a different avatar size can override it (mobile bubble uses 32px → `avatarCenter=20`).
  - `connectorLeft = avatarCenter - 1` (stroke `x=1` becomes the actual bar) so the bar visually sits at `avatarCenter`.
  - `connectorWidth = max(28, indent - connectorLeft - 4)` (preserves current arm length logic).
- `RepliedContent`: same mini-avatar + name + role badge + preview/attachment chip as today, no absolute children. Selectable via a stable class (e.g. `data-reply-content` / `.replied-content`).
- `ReplyLine` gets a stable class (`data-reply-line` / `.reply-line`) so it can also be targeted alone.

Public API of `RepliedLine` stays backward-compatible (same props). Internally it composes `<ReplyLine />` + `<RepliedContent />`. `ReplyLine` and `RepliedContent` are also `export`ed for callers that want to place them independently.

### Call sites (no functional change required, just verify indent prop)

`indent={52}` callers:
- `src/components/chat/ChatArea.tsx` (line 1497)
- `src/components/channels/AnnouncementChannel.tsx` (~903)
- `src/components/threads/ThreadView.tsx` (~866)
- `src/components/dm/DMConversation.tsx` (~453)
- `src/components/channels/media/MediaComments.tsx` (~145)
- `src/components/channels/announcement/AnnouncementComments.tsx` (~137)
- `src/components/mobile/dm/MobileMessageBubble.tsx` (~225) — 32px avatar context, pass `avatarCenter={20}` if visual check shows misalignment.

No behavior change is needed at the call site for desktop — the new default `avatarCenter=30` matches the unified message layout (`-mx-4 pl-[21px]` + avatar `-ml-[11px]` w-10).

### Tests
- Update `src/components/chat/__tests__/RepliedLine.test.tsx` to also assert that `ReplyLine` and `RepliedContent` render as two distinct elements (e.g. via `data-testid="reply-line"` and `data-testid="replied-content"`).

## Out of scope
- No change to message body padding, mention styling, or yellow border logic.
- No change to data fetching, jump-to-message, or tooltip behavior.
