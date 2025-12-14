-- Add thread_id column to typing_indicators table for thread typing support
ALTER TABLE public.typing_indicators 
ADD COLUMN thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE;

-- Add index for efficient thread-based queries
CREATE INDEX idx_typing_indicators_thread_id ON public.typing_indicators(thread_id) WHERE thread_id IS NOT NULL;