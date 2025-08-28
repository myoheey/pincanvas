-- Enable RLS on secure_comments and secure_likes tables
ALTER TABLE secure_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_likes ENABLE ROW LEVEL SECURITY;

-- Update drawings table RLS policy to allow anonymous users for public canvases
DROP POLICY IF EXISTS "drawings_allow_all" ON drawings;

-- Create new RLS policies for drawings table
CREATE POLICY "Users can view drawings of accessible canvases" 
ON drawings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can modify drawings of canvases they own or have editor access" 
ON drawings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email() 
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);

-- Fix search_path for get_current_user_email function if it exists
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;