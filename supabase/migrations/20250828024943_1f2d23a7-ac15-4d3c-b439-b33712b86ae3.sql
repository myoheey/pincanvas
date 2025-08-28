-- Create function to get current user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(auth.email(), '')::TEXT;
$$;

-- Also create a simpler RLS policy for drawings that works with anonymous users
DROP POLICY IF EXISTS "Users can view drawings of accessible canvases" ON drawings;
DROP POLICY IF EXISTS "Users can modify drawings of canvases they own or have editor access" ON drawings;

-- Create simpler policies
CREATE POLICY "Anyone can view drawings of public canvases" 
ON drawings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND canvases.is_public = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can modify drawings of public editor canvases" 
ON drawings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND canvases.is_public = true 
    AND canvases.public_permission = 'editor'
  )
  OR 
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);