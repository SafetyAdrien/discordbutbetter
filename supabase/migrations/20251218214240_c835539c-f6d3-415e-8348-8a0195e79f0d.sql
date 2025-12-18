-- Create category permission overrides table
CREATE TABLE public.category_permission_overrides (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
    permission public.server_permission NOT NULL,
    type text NOT NULL CHECK (type IN ('allow', 'deny')),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(category_id, role_id, permission)
);

-- Enable Row Level Security
ALTER TABLE public.category_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Members can view category permission overrides" 
ON public.category_permission_overrides 
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = category_permission_overrides.category_id 
    AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Admins can manage category permission overrides" 
ON public.category_permission_overrides 
FOR ALL
USING (EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = category_permission_overrides.category_id 
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
));

-- Add index for performance
CREATE INDEX idx_category_permission_overrides_category 
ON public.category_permission_overrides(category_id);

CREATE INDEX idx_category_permission_overrides_role 
ON public.category_permission_overrides(role_id);