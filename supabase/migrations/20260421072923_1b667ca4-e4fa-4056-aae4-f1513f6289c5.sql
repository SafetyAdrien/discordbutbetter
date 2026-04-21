-- Annonces : ajout du lien de réponse entre commentaires
ALTER TABLE public.announcement_comments
  ADD COLUMN reply_to_id uuid REFERENCES public.announcement_comments(id) ON DELETE SET NULL;

CREATE INDEX idx_announcement_comments_reply_to_id 
  ON public.announcement_comments(reply_to_id);

-- Médias : ajout du lien de réponse entre commentaires
ALTER TABLE public.media_post_comments
  ADD COLUMN reply_to_id uuid REFERENCES public.media_post_comments(id) ON DELETE SET NULL;

CREATE INDEX idx_media_post_comments_reply_to_id 
  ON public.media_post_comments(reply_to_id);