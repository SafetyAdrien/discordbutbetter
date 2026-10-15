-- Support the composite keyset pagination used by the message history
-- (loadOlder): ordering by (created_at, id) on a channel.
--
-- Without this index Postgres must sort every message of the channel at read
-- time, which gets progressively slower as a channel accumulates history.

CREATE INDEX IF NOT EXISTS messages_channel_id_created_at_id_idx
  ON public.messages (channel_id, created_at DESC, id DESC);

-- Same for DM conversations (useDMMessages uses the same pattern).
CREATE INDEX IF NOT EXISTS dm_messages_conversation_id_created_at_id_idx
  ON public.dm_messages (conversation_id, created_at DESC, id DESC);

-- Unread counts query messages newer than the last-read marker for many
-- channels at once; this composite index avoids a scan per channel.
CREATE INDEX IF NOT EXISTS messages_channel_id_created_at_idx
  ON public.messages (channel_id, created_at);