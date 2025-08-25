-- Allow anonymous editing for public canvases with editor permission
-- Update RLS policies to allow anonymous users to edit when canvas is public with editor permission

-- Update pins policy to allow anonymous editing on public editor canvases
DROP POLICY IF EXISTS "Users can modify pins of canvases they own or have editor acces" ON public.pins;
CREATE POLICY "Users can modify pins of canvases they own or have editor access" 
ON public.pins 
FOR ALL 
USING (
  EXISTS ( 
    SELECT 1
    FROM canvases
    WHERE (canvases.id = pins.canvas_id) 
    AND (
      (canvases.owner_id = auth.uid()) 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR (EXISTS ( 
        SELECT 1
        FROM canvas_shares
        WHERE (canvas_shares.canvas_id = canvases.id) 
        AND (canvas_shares.shared_with_email = get_current_user_email()) 
        AND (canvas_shares.permission = 'editor')
      ))
    )
  )
);

-- Update layers policy to allow anonymous editing on public editor canvases  
DROP POLICY IF EXISTS "Users can modify layers of canvases they own or have editor acc" ON public.layers;
CREATE POLICY "Users can modify layers of canvases they own or have editor access" 
ON public.layers 
FOR ALL 
USING (
  EXISTS ( 
    SELECT 1
    FROM canvases
    WHERE (canvases.id = layers.canvas_id) 
    AND (
      (canvases.owner_id = auth.uid()) 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR (EXISTS ( 
        SELECT 1
        FROM canvas_shares
        WHERE (canvas_shares.canvas_id = canvases.id) 
        AND (canvas_shares.shared_with_email = get_current_user_email()) 
        AND (canvas_shares.permission = 'editor')
      ))
    )
  )
);

-- Update drawings policy to allow anonymous editing on public editor canvases
DROP POLICY IF EXISTS "Users can modify drawings of canvases they own or have editor a" ON public.drawings;
CREATE POLICY "Users can modify drawings of canvases they own or have editor access" 
ON public.drawings 
FOR ALL 
USING (
  EXISTS ( 
    SELECT 1
    FROM canvases
    WHERE (canvases.id = drawings.canvas_id) 
    AND (
      (canvases.owner_id = auth.uid()) 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR (EXISTS ( 
        SELECT 1
        FROM canvas_shares
        WHERE (canvas_shares.canvas_id = canvases.id) 
        AND (canvas_shares.shared_with_email = get_current_user_email()) 
        AND (canvas_shares.permission = 'editor')
      ))
    )
  )
);

-- Update media_items policy to allow anonymous editing on public editor canvases
DROP POLICY IF EXISTS "Users can modify media items of pins they have editor access to" ON public.media_items;
CREATE POLICY "Users can modify media items of pins they have editor access to" 
ON public.media_items 
FOR ALL 
USING (
  EXISTS ( 
    SELECT 1
    FROM (pins JOIN canvases ON (canvases.id = pins.canvas_id))
    WHERE (pins.id = media_items.pin_id) 
    AND (
      (canvases.owner_id = auth.uid()) 
      OR (canvases.is_public = true AND canvases.public_permission = 'editor')
      OR (EXISTS ( 
        SELECT 1
        FROM canvas_shares
        WHERE (canvas_shares.canvas_id = canvases.id) 
        AND (canvas_shares.shared_with_email = get_current_user_email()) 
        AND (canvas_shares.permission = 'editor')
      ))
    )
  )
);

-- Update comments policies for anonymous editing
DROP POLICY IF EXISTS "Users can create comments on accessible pins" ON public.comments;
CREATE POLICY "Users can create comments on accessible pins" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1
    FROM (pins JOIN canvases ON (canvases.id = pins.canvas_id))
    WHERE (pins.id = comments.pin_id) 
    AND (canvases.allow_comments = true) 
    AND (
      (canvases.is_public = true) 
      OR ((auth.uid() IS NOT NULL) AND (
        (canvases.owner_id = auth.uid()) 
        OR (EXISTS ( 
          SELECT 1
          FROM canvas_shares
          WHERE (canvas_shares.canvas_id = canvases.id) 
          AND (canvas_shares.shared_with_email = get_current_user_email())
        ))
      ))
    )
  )
);

-- Update likes policies for anonymous editing
DROP POLICY IF EXISTS "Users can create likes on accessible pins" ON public.likes;
CREATE POLICY "Users can create likes on accessible pins" 
ON public.likes 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1
    FROM (pins JOIN canvases ON (canvases.id = pins.canvas_id))
    WHERE (pins.id = likes.pin_id) 
    AND (canvases.allow_likes = true) 
    AND (
      (canvases.is_public = true) 
      OR ((auth.uid() IS NOT NULL) AND (
        (canvases.owner_id = auth.uid()) 
        OR (EXISTS ( 
          SELECT 1
          FROM canvas_shares
          WHERE (canvas_shares.canvas_id = canvases.id) 
          AND (canvas_shares.shared_with_email = get_current_user_email())
        ))
      ))
    )
  )
);