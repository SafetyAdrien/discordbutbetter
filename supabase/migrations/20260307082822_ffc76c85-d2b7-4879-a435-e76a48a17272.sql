ALTER TABLE public.threads ADD COLUMN locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.threads ADD COLUMN closed boolean NOT NULL DEFAULT false;