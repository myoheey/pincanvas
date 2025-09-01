-- Fix RLS policies to allow anonymous access for public canvases
-- This fixes the 406 error when anonymous users try to save drawings

-- Update drawings policies to allow anonymous users
DROP POLICY IF EXISTS "Anyone can view drawings of public canvases" ON drawings;
DROP POLICY IF EXISTS "Anyone can modify drawings of public editor canvases" ON drawings;

-- Create more permissive policies for anonymous access
CREATE POLICY "Allow viewing drawings for public canvases" 
ON drawings 
FOR SELECT 
TO public, anon, authenticated
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

CREATE POLICY "Allow modifying drawings for public editor canvases" 
ON drawings 
FOR ALL 
TO public, anon, authenticated
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

-- Also update pins policies for consistency
DROP POLICY IF EXISTS "Users can view pins of accessible canvases" ON pins;
DROP POLICY IF EXISTS "Users can modify pins of canvases they own or have editor access" ON pins;

CREATE POLICY "Allow viewing pins for public canvases" 
ON pins 
FOR SELECT 
TO public, anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND canvases.is_public = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Allow modifying pins for public editor canvases" 
ON pins 
FOR ALL 
TO public, anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND canvases.is_public = true 
    AND canvases.public_permission = 'editor'
  )
  OR 
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);