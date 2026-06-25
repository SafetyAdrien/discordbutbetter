CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  tags text[] NOT NULL DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  comment_count integer NOT NULL DEFAULT 0,
  upvote_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forum_posts_channel_idx ON public.forum_posts(channel_id, last_activity_at DESC);
CREATE INDEX forum_posts_author_idx ON public.forum_posts(author_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view forum posts" ON public.forum_posts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.server_id = forum_posts.server_id AND sm.user_id = auth.uid()));
CREATE POLICY "Members can create forum posts" ON public.forum_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.server_id = forum_posts.server_id AND sm.user_id = auth.uid()));
CREATE POLICY "Authors or admins can update forum posts" ON public.forum_posts FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.is_app_admin())
WITH CHECK (author_id = auth.uid() OR public.is_app_admin());
CREATE POLICY "Authors or admins can delete forum posts" ON public.forum_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_app_admin());

CREATE TABLE public.forum_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.forum_post_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forum_post_comments_post_idx ON public.forum_post_comments(post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_post_comments TO authenticated;
GRANT ALL ON public.forum_post_comments TO service_role;
ALTER TABLE public.forum_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view forum comments" ON public.forum_post_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.forum_posts fp JOIN public.server_members sm ON sm.server_id = fp.server_id WHERE fp.id = forum_post_comments.post_id AND sm.user_id = auth.uid()));
CREATE POLICY "Members can create forum comments" ON public.forum_post_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.forum_posts fp JOIN public.server_members sm ON sm.server_id = fp.server_id WHERE fp.id = forum_post_comments.post_id AND sm.user_id = auth.uid() AND fp.is_locked = false));
CREATE POLICY "Authors can update own comments" ON public.forum_post_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors or admins can delete comments" ON public.forum_post_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_app_admin());

CREATE TABLE public.forum_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.forum_post_reactions TO authenticated;
GRANT ALL ON public.forum_post_reactions TO service_role;
ALTER TABLE public.forum_post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view forum post reactions" ON public.forum_post_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.forum_posts fp JOIN public.server_members sm ON sm.server_id = fp.server_id WHERE fp.id = forum_post_reactions.post_id AND sm.user_id = auth.uid()));
CREATE POLICY "Users add own forum post reactions" ON public.forum_post_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own forum post reactions" ON public.forum_post_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.forum_post_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.forum_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.forum_post_comment_reactions TO authenticated;
GRANT ALL ON public.forum_post_comment_reactions TO service_role;
ALTER TABLE public.forum_post_comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view forum comment reactions" ON public.forum_post_comment_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.forum_post_comments fc JOIN public.forum_posts fp ON fp.id = fc.post_id JOIN public.server_members sm ON sm.server_id = fp.server_id WHERE fc.id = forum_post_comment_reactions.comment_id AND sm.user_id = auth.uid()));
CREATE POLICY "Users add own forum comment reactions" ON public.forum_post_comment_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own forum comment reactions" ON public.forum_post_comment_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.forum_post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_post_votes TO authenticated;
GRANT ALL ON public.forum_post_votes TO service_role;
ALTER TABLE public.forum_post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view forum votes" ON public.forum_post_votes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.forum_posts fp JOIN public.server_members sm ON sm.server_id = fp.server_id WHERE fp.id = forum_post_votes.post_id AND sm.user_id = auth.uid()));
CREATE POLICY "Users add own forum vote" ON public.forum_post_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own forum vote" ON public.forum_post_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.forum_update_post_counters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'forum_post_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.forum_posts SET comment_count = comment_count + 1, last_activity_at = now() WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.forum_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'forum_post_votes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.forum_posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.forum_posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_forum_comments_counter AFTER INSERT OR DELETE ON public.forum_post_comments
FOR EACH ROW EXECUTE FUNCTION public.forum_update_post_counters();
CREATE TRIGGER trg_forum_votes_counter AFTER INSERT OR DELETE ON public.forum_post_votes
FOR EACH ROW EXECUTE FUNCTION public.forum_update_post_counters();
CREATE TRIGGER trg_forum_posts_updated BEFORE UPDATE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_forum_post_comments_updated BEFORE UPDATE ON public.forum_post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.forum_posts REPLICA IDENTITY FULL;
ALTER TABLE public.forum_post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.forum_post_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.forum_post_comment_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.forum_post_votes REPLICA IDENTITY FULL;