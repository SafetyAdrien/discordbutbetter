WITH duplicate_indicators AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, channel_id, conversation_id, thread_id
      ORDER BY started_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.typing_indicators
)
DELETE FROM public.typing_indicators AS indicators
USING duplicate_indicators
WHERE indicators.id = duplicate_indicators.id
  AND duplicate_indicators.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_user_channel_unique
  ON public.typing_indicators (user_id, channel_id)
  WHERE channel_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_user_conversation_unique
  ON public.typing_indicators (user_id, conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_user_thread_unique
  ON public.typing_indicators (user_id, thread_id)
  WHERE thread_id IS NOT NULL;

ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;
