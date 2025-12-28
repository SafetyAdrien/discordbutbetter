-- Drop existing policies on categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Members can view categories" ON public.categories;

-- Create comprehensive policies for categories
CREATE POLICY "Members can view categories" 
ON public.categories 
FOR SELECT 
USING (public.is_server_member(auth.uid(), server_id) OR public.is_server_owner(auth.uid(), server_id));

CREATE POLICY "Admins can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));

CREATE POLICY "Admins can update categories" 
ON public.categories 
FOR UPDATE 
USING (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission))
WITH CHECK (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));

CREATE POLICY "Admins can delete categories" 
ON public.categories 
FOR DELETE 
USING (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));

-- Drop existing policies on channels
DROP POLICY IF EXISTS "Admins can manage channels" ON public.channels;
DROP POLICY IF EXISTS "Members can view channels" ON public.channels;

-- Create comprehensive policies for channels  
CREATE POLICY "Members can view channels" 
ON public.channels 
FOR SELECT 
USING (public.is_server_member(auth.uid(), server_id) OR public.is_server_owner(auth.uid(), server_id));

CREATE POLICY "Admins can insert channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));

CREATE POLICY "Admins can update channels" 
ON public.channels 
FOR UPDATE 
USING (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission))
WITH CHECK (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));

CREATE POLICY "Admins can delete channels" 
ON public.channels 
FOR DELETE 
USING (public.has_server_permission(auth.uid(), server_id, 'manage_channels'::server_permission));