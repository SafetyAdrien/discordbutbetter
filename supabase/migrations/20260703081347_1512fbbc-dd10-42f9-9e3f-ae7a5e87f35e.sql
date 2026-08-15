
CREATE TABLE public.user_ui_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_case jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ui_preferences TO authenticated;
GRANT ALL ON public.user_ui_preferences TO service_role;

ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_ui_prefs_select_own" ON public.user_ui_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_ui_prefs_insert_own" ON public.user_ui_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_ui_prefs_update_own" ON public.user_ui_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_ui_prefs_delete_own" ON public.user_ui_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_ui_prefs_updated_at
BEFORE UPDATE ON public.user_ui_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_ui_preferences REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_ui_preferences;
