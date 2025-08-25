-- Fix canvas RLS policies to prevent infinite recursion
DROP POLICY IF EXISTS "Users can view their own canvases and shared canvases" ON canvases;
DROP POLICY IF EXISTS "Users can update their own canvases or shared canvases with edi" ON canvases;

-- Create simpler RLS policies for canvases
CREATE POLICY "Users can view their own canvases"
ON canvases
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can view shared canvases"
ON canvases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM canvas_shares
    WHERE canvas_shares.canvas_id = canvases.id
    AND canvas_shares.shared_with_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own canvases"
ON canvases
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can update shared canvases with editor permission"
ON canvases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM canvas_shares
    WHERE canvas_shares.canvas_id = canvases.id
    AND canvas_shares.shared_with_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND canvas_shares.permission = 'editor'
  )
);