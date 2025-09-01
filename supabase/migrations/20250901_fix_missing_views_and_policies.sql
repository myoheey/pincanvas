-- Fix missing secure views and RLS policies for drawings table
-- This migration fixes the 404 errors on secure_comments and drawings access issues

-- 1. Ensure secure_comments view exists and works
DROP VIEW IF EXISTS public.secure_comments;
CREATE OR REPLACE VIEW public.secure_comments AS
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

-- 2. Ensure secure_likes view exists and works  
DROP VIEW IF EXISTS public.secure_likes;
CREATE OR REPLACE VIEW public.secure_likes AS
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

-- 3. Grant proper permissions to the secure views
GRANT SELECT ON public.secure_comments TO authenticated, anon;
GRANT SELECT ON public.secure_likes TO authenticated, anon;

-- 4. Enable RLS on drawings table (if not already enabled)
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

-- 5. Create comprehensive RLS policies for drawings table
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view drawings of accessible canvases" ON public.drawings;
DROP POLICY IF EXISTS "Users can insert drawings on accessible canvases" ON public.drawings;
DROP POLICY IF EXISTS "Users can update drawings on accessible canvases" ON public.drawings;
DROP POLICY IF EXISTS "Users can delete drawings on accessible canvases" ON public.drawings;

-- Allow viewing drawings for accessible canvases (including public canvases)
CREATE POLICY "Users can view drawings of accessible canvases" 
ON public.drawings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

-- Allow inserting drawings for editable canvases
CREATE POLICY "Users can insert drawings on accessible canvases" 
ON public.drawings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);

-- Allow updating drawings for editable canvases
CREATE POLICY "Users can update drawings on accessible canvases" 
ON public.drawings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);

-- Allow deleting drawings for editable canvases
CREATE POLICY "Users can delete drawings on accessible canvases" 
ON public.drawings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);

-- 6. Enable RLS on comments and likes tables (if not already enabled)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for comments table
DROP POLICY IF EXISTS "Users can view comments on accessible pins" ON public.comments;
DROP POLICY IF EXISTS "Users can insert comments on accessible pins" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments or canvas owners can delete" ON public.comments;

-- View comments for accessible canvases
CREATE POLICY "Users can view comments on accessible pins" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

-- Insert comments on accessible pins
CREATE POLICY "Users can insert comments on accessible pins" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND canvases.allow_comments = true
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

-- Update own comments
CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (
  author_email = get_current_user_email() 
  OR author_name = get_current_user_email()
);

-- Delete own comments or canvas owner can delete
CREATE POLICY "Users can delete their own comments or canvas owners can delete" 
ON public.comments 
FOR DELETE 
USING (
  author_email = get_current_user_email() 
  OR author_name = get_current_user_email()
  OR EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND canvases.owner_id = auth.uid()
  )
);

-- 8. Create RLS policies for likes table
DROP POLICY IF EXISTS "Users can view likes on accessible pins" ON public.likes;
DROP POLICY IF EXISTS "Users can insert likes on accessible pins" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

-- View likes for accessible canvases
CREATE POLICY "Users can view likes on accessible pins" 
ON public.likes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = likes.pin_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

-- Insert likes on accessible pins
CREATE POLICY "Users can insert likes on accessible pins" 
ON public.likes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = likes.pin_id 
    AND canvases.allow_likes = true
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

-- Delete own likes
CREATE POLICY "Users can delete their own likes" 
ON public.likes 
FOR DELETE 
USING (
  author_email = get_current_user_email() 
  OR author_name = get_current_user_email()
);

-- 9. Ensure anonymous access works for public canvases by improving policies
-- Allow anonymous users to view public canvases' content
DROP POLICY IF EXISTS "Anonymous users can view drawings of public canvases" ON public.drawings;
CREATE POLICY "Anonymous users can view drawings of public canvases" 
ON public.drawings 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.canvases 
    WHERE canvases.id = drawings.canvas_id 
    AND canvases.is_public = true
  )
);

DROP POLICY IF EXISTS "Anonymous users can view comments on public canvases" ON public.comments;
CREATE POLICY "Anonymous users can view comments on public canvases" 
ON public.comments 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND canvases.is_public = true
  )
);

DROP POLICY IF EXISTS "Anonymous users can view likes on public canvases" ON public.likes;
CREATE POLICY "Anonymous users can view likes on public canvases" 
ON public.likes 
FOR SELECT 
USING (
  auth.uid() IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.pins 
    JOIN public.canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = likes.pin_id 
    AND canvases.is_public = true
  )
);