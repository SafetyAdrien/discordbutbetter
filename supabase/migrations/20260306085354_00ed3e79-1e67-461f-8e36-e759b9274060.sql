
ALTER TABLE public.messages ADD COLUMN is_system boolean NOT NULL DEFAULT false;
ALTER TABLE public.threads ADD COLUMN is_private boolean NOT NULL DEFAULT false;
