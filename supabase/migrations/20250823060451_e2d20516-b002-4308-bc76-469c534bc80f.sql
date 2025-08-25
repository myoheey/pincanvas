-- Fix security vulnerability in canvas_shares table
-- Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "Canvas owners can view their canvas shares" ON public.canvas_shares;

-- Create more secure policies for canvas_shares
-- Policy 1: Canvas owners can view shares for their own canvases
CREATE POLICY "Canvas owners can view their canvas shares"
ON public.canvas_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

-- Policy 2: Shared users can view only their own share record
CREATE POLICY "Shared users can view their own share"
ON public.canvas_shares
FOR SELECT
USING (
  shared_with_email = get_current_user_email()
);

-- Ensure no public access to canvas_shares even through public canvases
-- The existing INSERT and DELETE policies are already secure and only allow canvas owners