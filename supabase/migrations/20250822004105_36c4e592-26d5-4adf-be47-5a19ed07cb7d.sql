-- Create secure views that mask email addresses for public access
-- First, create a function to check if current user has access to see emails
CREATE OR REPLACE FUNCTION public.can_see_author_email(canvas_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Users can see emails if they own the canvas or have been shared with it
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create secure view for comments that masks emails for public access
CREATE VIEW public.comments_secure AS
SELECT 
  id,
  pin_id,
  content,
  author_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pins 
      JOIN canvases ON canvases.id = pins.canvas_id 
      WHERE pins.id = comments.pin_id 
      AND public.can_see_author_email(canvases.id)
    ) THEN author_email
    ELSE NULL
  END as author_email,
  created_at,
  updated_at
FROM public.comments;

-- Create secure view for likes that masks emails for public access  
CREATE VIEW public.likes_secure AS
SELECT 
  id,
  pin_id,
  author_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pins 
      JOIN canvases ON canvases.id = pins.canvas_id 
      WHERE pins.id = likes.pin_id 
      AND public.can_see_author_email(canvases.id)
    ) THEN author_email
    ELSE NULL
  END as author_email,
  created_at
FROM public.likes;

-- Grant appropriate permissions on the views
GRANT SELECT ON public.comments_secure TO authenticated, anon;
GRANT SELECT ON public.likes_secure TO authenticated, anon;

-- Create RLS policies for the secure views
ALTER VIEW public.comments_secure SET (security_barrier = true);
ALTER VIEW public.likes_secure SET (security_barrier = true);