-- Drop the views that caused security warnings
DROP VIEW IF EXISTS public.comments_secure;
DROP VIEW IF EXISTS public.likes_secure;

-- Drop the function as well
DROP FUNCTION IF EXISTS public.can_see_author_email(uuid);

-- Instead, we'll handle this at the application level by creating a helper function
-- that returns whether the current user can see author emails for a specific canvas
CREATE OR REPLACE FUNCTION public.user_can_see_emails_for_canvas(canvas_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Return true if user owns the canvas or has been shared access to it
  RETURN EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_can_see_emails_for_canvas(uuid) TO authenticated;