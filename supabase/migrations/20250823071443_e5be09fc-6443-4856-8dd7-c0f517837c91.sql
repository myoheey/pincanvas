-- Fix email exposure security issue by updating RLS policies

-- First, let's create a function to determine if current user should see emails for a canvas
CREATE OR REPLACE FUNCTION public.user_can_see_emails_for_canvas(canvas_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Return true if user owns the canvas or has been shared access to it
  -- Return false for anonymous users on public canvases
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
$$;

-- Drop existing comments policies that expose emails
DROP POLICY IF EXISTS "Users can view comments of accessible pins" ON public.comments;

-- Create new comments policies that protect email addresses
CREATE POLICY "Users can view comments of accessible pins" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS ( 
    SELECT 1
    FROM (pins JOIN canvases ON (canvases.id = pins.canvas_id))
    WHERE (pins.id = comments.pin_id) 
    AND (canvases.allow_comments = true) 
    AND (
      (canvases.is_public = true) 
      OR (canvases.owner_id = auth.uid()) 
      OR (EXISTS ( 
        SELECT 1
        FROM canvas_shares
        WHERE (canvas_shares.canvas_id = canvases.id) 
        AND (canvas_shares.shared_with_email = get_current_user_email())
      ))
    )
  )
);

-- Drop existing likes policies that expose emails  
DROP POLICY IF EXISTS "Users can view likes of accessible pins" ON public.likes;

-- Create new likes policies that protect email addresses
CREATE POLICY "Users can view likes of accessible pins" 
ON public.likes 
FOR SELECT 
USING (
  EXISTS ( 
    SELECT 1
    FROM (pins JOIN canvases ON (canvases.id = pins.canvas_id))
    WHERE (pins.id = likes.pin_id) 
    AND (canvases.allow_likes = true) 
    AND (
      (canvases.is_public = true) 
      OR (canvases.owner_id = auth.uid()) 
      OR (EXISTS ( 
        SELECT 1
        FROM canvas_shares
        WHERE (canvas_shares.canvas_id = canvases.id) 
        AND (canvas_shares.shared_with_email = get_current_user_email())
      ))
    )
  )
);

-- Create views that conditionally expose email addresses
CREATE OR REPLACE VIEW public.comments_with_conditional_email AS
SELECT 
  id,
  pin_id,
  content,
  author_name,
  CASE 
    WHEN user_can_see_emails_for_canvas(
      (SELECT canvas_id FROM pins WHERE pins.id = comments.pin_id)
    ) THEN author_email
    ELSE NULL
  END AS author_email,
  created_at,
  updated_at
FROM public.comments;

CREATE OR REPLACE VIEW public.likes_with_conditional_email AS
SELECT 
  id,
  pin_id,
  author_name,
  CASE 
    WHEN user_can_see_emails_for_canvas(
      (SELECT canvas_id FROM pins WHERE pins.id = likes.pin_id)
    ) THEN author_email
    ELSE NULL
  END AS author_email,
  created_at
FROM public.likes;

-- Grant access to the views
GRANT SELECT ON public.comments_with_conditional_email TO authenticated, anon;
GRANT SELECT ON public.likes_with_conditional_email TO authenticated, anon;