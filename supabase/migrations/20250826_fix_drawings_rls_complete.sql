-- Complete drawings RLS policy fix
-- This migration ensures drawings table RLS policies work correctly

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view drawings of accessible canvases" ON public.drawings;
DROP POLICY IF EXISTS "Users can modify drawings of canvases they own or have editor access" ON public.drawings;
DROP POLICY IF EXISTS "Users can create drawings for accessible canvases" ON public.drawings;
DROP POLICY IF EXISTS "Users can update drawings for accessible canvases" ON public.drawings;  
DROP POLICY IF EXISTS "Users can delete drawings for accessible canvases" ON public.drawings;

-- Create or replace the helper function for canvas access
CREATE OR REPLACE FUNCTION user_has_canvas_access(canvas_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no user, deny access
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user owns the canvas
  IF EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE id = canvas_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if canvas is public
  IF EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE id = canvas_id AND is_public = true
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has explicit share access
  IF EXISTS (
    SELECT 1 FROM public.canvas_shares cs
    JOIN auth.users u ON u.email = cs.shared_with_email
    WHERE cs.canvas_id = canvas_id AND u.id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create or replace function for checking edit permissions
CREATE OR REPLACE FUNCTION user_has_canvas_access_with_permission(canvas_id UUID, user_id UUID, required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no user, deny access
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user owns the canvas (owners have all permissions)
  IF EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE id = canvas_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check public canvas permissions
  IF EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE id = canvas_id 
    AND is_public = true 
    AND (
      required_permission = 'viewer' 
      OR (required_permission = 'editor' AND public_permission = 'editor')
    )
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check explicit share permissions
  IF EXISTS (
    SELECT 1 FROM public.canvas_shares cs
    JOIN auth.users u ON u.email = cs.shared_with_email
    WHERE cs.canvas_id = canvas_id 
    AND u.id = user_id
    AND (
      required_permission = 'viewer'
      OR (required_permission = 'editor' AND cs.permission = 'editor')
    )
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create simplified RLS policies for drawings
CREATE POLICY "Allow users to view drawings they have access to" 
ON public.drawings 
FOR SELECT 
USING (user_has_canvas_access(canvas_id, auth.uid()));

CREATE POLICY "Allow users to insert drawings for canvases they can edit" 
ON public.drawings 
FOR INSERT 
WITH CHECK (user_has_canvas_access_with_permission(canvas_id, auth.uid(), 'editor'));

CREATE POLICY "Allow users to update drawings for canvases they can edit" 
ON public.drawings 
FOR UPDATE 
USING (user_has_canvas_access_with_permission(canvas_id, auth.uid(), 'editor'));

CREATE POLICY "Allow users to delete drawings for canvases they can edit" 
ON public.drawings 
FOR DELETE 
USING (user_has_canvas_access_with_permission(canvas_id, auth.uid(), 'editor'));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.drawings TO authenticated;