-- Add an optional emoji icon to categories, shown next to the category name.
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS icon TEXT;
