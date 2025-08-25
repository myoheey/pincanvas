-- Add missing RLS policies for drawings table

-- Allow users to insert drawings for canvases they have access to
CREATE POLICY "Users can create drawings for accessible canvases" 
ON public.drawings 
FOR INSERT 
WITH CHECK (user_has_canvas_access(canvas_id, auth.uid()));

-- Allow users to update drawings for canvases they have access to
CREATE POLICY "Users can update drawings for accessible canvases" 
ON public.drawings 
FOR UPDATE 
USING (user_has_canvas_access(canvas_id, auth.uid()));

-- Allow users to delete drawings for canvases they have access to
CREATE POLICY "Users can delete drawings for accessible canvases" 
ON public.drawings 
FOR DELETE 
USING (user_has_canvas_access(canvas_id, auth.uid()));
