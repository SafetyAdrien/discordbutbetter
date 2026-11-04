-- Salon : impose (ou non) un premier message lors de la creation d'un fil. Desactive par defaut.
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS thread_first_message_required boolean NOT NULL DEFAULT false;
