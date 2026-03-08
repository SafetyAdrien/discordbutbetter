

# Convert Remaining User IDs to Snowflake in MemberList

## Problem
`MemberList.tsx` line 474 copies user IDs as raw UUIDs. All other copy-ID locations already use `uuidToSnowflake()`.

## Change

| File | Line | Current | New |
|------|------|---------|-----|
| `MemberList.tsx` | 1 (imports) | Add `import { uuidToSnowflake } from '@/lib/snowflake'` | — |
| `MemberList.tsx` | 474-476 | `copyToClipboard(id, "ID utilisateur copié")` | `copyToClipboard(uuidToSnowflake(id), "ID utilisateur copié")` |

Single-line fix — wraps the user ID with `uuidToSnowflake()` before copying to clipboard.

