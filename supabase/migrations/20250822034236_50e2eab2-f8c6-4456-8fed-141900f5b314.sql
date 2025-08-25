-- Security Fix: Prevent email harvesting by restricting email visibility
-- This migration addresses email exposure in canvas_shares, comments, and likes tables

-- First, let's ensure canvas_shares emails are only visible to canvas owners
-- Drop existing canvas_shares policies to recreate them with better security
DROP POLICY IF EXISTS "Users can view shares of their own canvases" ON canvas_shares;
DROP POLICY IF EXISTS "Users can create shares for their own canvases" ON canvas_shares;  
DROP POLICY IF EXISTS "Users can delete shares of their own canvases" ON canvas_shares;

-- Recreate canvas_shares policies with strict owner-only email visibility
CREATE POLICY "Canvas owners can view their canvas shares"
ON canvas_shares FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Canvas owners can create shares for their canvases"
ON canvas_shares FOR INSERT
TO authenticated  
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Canvas owners can delete shares from their canvases"
ON canvas_shares FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

-- Create a secure function to check if user has access without exposing emails
CREATE OR REPLACE FUNCTION public.user_has_canvas_access(canvas_id uuid, user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Check if user owns the canvas or has been granted access
  RETURN EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR (
        canvases.is_public = true
      )
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = user_email
      )
    )
  );
END;
$function$;

-- Update comments policies to maintain functionality while protecting emails
-- Drop existing comment policies
DROP POLICY IF EXISTS "Users can view comments of accessible pins" ON comments;
DROP POLICY IF EXISTS "Users can create comments on accessible pins" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments or canvas owners can delete" ON comments;

-- Create new comment policies that maintain the same access but protect privacy
CREATE POLICY "Users can view comments of accessible pins"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pins
    JOIN canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND canvases.allow_comments = true
    AND (
      canvases.is_public = true 
      OR canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can create comments on accessible pins" 
ON comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pins
    JOIN canvases ON canvases.id = pins.canvas_id  
    WHERE pins.id = comments.pin_id
    AND canvases.allow_comments = true
    AND (
      canvases.is_public = true
      OR (
        auth.uid() IS NOT NULL AND (
          canvases.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM canvas_shares 
            WHERE canvas_shares.canvas_id = canvases.id 
            AND canvas_shares.shared_with_email = get_current_user_email()
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE  
TO authenticated
USING (
  author_email = get_current_user_email()
  OR EXISTS (
    SELECT 1 FROM pins
    JOIN canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own comments or canvas owners can delete"
ON comments FOR DELETE
TO authenticated  
USING (
  author_email = get_current_user_email()
  OR EXISTS (
    SELECT 1 FROM pins
    JOIN canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = comments.pin_id 
    AND canvases.owner_id = auth.uid()
  )
);

-- Update likes policies to protect email privacy  
DROP POLICY IF EXISTS "Users can view likes of accessible pins" ON likes;
DROP POLICY IF EXISTS "Users can create likes on accessible pins" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

CREATE POLICY "Users can view likes of accessible pins"
ON likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pins
    JOIN canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = likes.pin_id 
    AND canvases.allow_likes = true
    AND (
      canvases.is_public = true 
      OR canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can create likes on accessible pins"
ON likes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pins  
    JOIN canvases ON canvases.id = pins.canvas_id
    WHERE pins.id = likes.pin_id
    AND canvases.allow_likes = true
    AND (
      canvases.is_public = true
      OR (
        auth.uid() IS NOT NULL AND (
          canvases.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM canvas_shares 
            WHERE canvas_shares.canvas_id = canvases.id 
            AND canvas_shares.shared_with_email = get_current_user_email()
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can delete their own likes"
ON likes FOR DELETE
TO authenticated
USING (author_email = get_current_user_email());