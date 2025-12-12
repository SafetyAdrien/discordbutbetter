-- Create announcement_categories table
CREATE TABLE public.announcement_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5865f2',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES announcement_categories(id) ON DELETE SET NULL,
  banner_url TEXT,
  pinned BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);

-- Create announcement_comments table
CREATE TABLE public.announcement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);

-- Create announcement_reactions table
CREATE TABLE public.announcement_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (announcement_id, user_id, emoji)
);

-- Enable RLS on all tables
ALTER TABLE public.announcement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcement_categories
CREATE POLICY "Members can view announcement categories"
  ON public.announcement_categories FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can manage announcement categories"
  ON public.announcement_categories FOR ALL
  USING (has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));

-- RLS policies for announcements
CREATE POLICY "Members can view announcements"
  ON public.announcements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = announcements.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  ));

CREATE POLICY "Admins can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = announcements.channel_id
      AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
    )
  );

CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = announcements.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  ));

CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = announcements.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  ));

-- RLS policies for announcement_comments
CREATE POLICY "Members can view comments"
  ON public.announcement_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM announcements a
    JOIN channels c ON c.id = a.channel_id
    WHERE a.id = announcement_comments.announcement_id
    AND is_server_member(auth.uid(), c.server_id)
  ));

CREATE POLICY "Members can add comments"
  ON public.announcement_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN channels c ON c.id = a.channel_id
      WHERE a.id = announcement_comments.announcement_id
      AND is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Authors can delete their comments"
  ON public.announcement_comments FOR DELETE
  USING (auth.uid() = author_id);

-- RLS policies for announcement_reactions
CREATE POLICY "Members can view reactions"
  ON public.announcement_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM announcements a
    JOIN channels c ON c.id = a.channel_id
    WHERE a.id = announcement_reactions.announcement_id
    AND is_server_member(auth.uid(), c.server_id)
  ));

CREATE POLICY "Members can add reactions"
  ON public.announcement_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN channels c ON c.id = a.channel_id
      WHERE a.id = announcement_reactions.announcement_id
      AND is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Users can remove their reactions"
  ON public.announcement_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for announcement banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-banners', 'announcement-banners', true);

-- Storage policies
CREATE POLICY "Anyone can view announcement banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-banners');

CREATE POLICY "Authenticated users can upload announcement banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'announcement-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their uploaded banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'announcement-banners' AND auth.uid() IS NOT NULL);

-- Enable realtime for announcements and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;