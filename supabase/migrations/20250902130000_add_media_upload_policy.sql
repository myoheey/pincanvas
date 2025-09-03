-- Add policies for media file uploads in canvas-backgrounds bucket
-- These files will be stored in the media/ folder
-- Allow both authenticated and anonymous users to upload media files

-- Allow anyone to read objects in canvas-backgrounds
CREATE POLICY "Public read access to canvas-backgrounds" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'canvas-backgrounds');

-- Update existing insert policy to allow anonymous users for media files
DROP POLICY IF EXISTS "Authenticated users can upload canvas backgrounds" ON storage.objects;

CREATE POLICY "Public upload to canvas-backgrounds media folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'canvas-backgrounds' 
  AND (
    -- Canvas background images (requires authentication)
    (auth.uid() IS NOT NULL AND name ~ '^[a-f0-9\-]+/.*\.(jpg|jpeg|png|gif|webp)$')
    OR
    -- Media files in media/ folder (public access)
    name ~ '^media/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi|ogg)$'
  )
);

-- Update existing update policy - only authenticated users can update
DROP POLICY IF EXISTS "Authenticated users can update canvas backgrounds" ON storage.objects;

CREATE POLICY "Authenticated users can update canvas-backgrounds objects" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid() IS NOT NULL
);

-- Update existing delete policy - allow public delete for media files
DROP POLICY IF EXISTS "Authenticated users can delete canvas backgrounds" ON storage.objects;

CREATE POLICY "Public delete from canvas-backgrounds media folder" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'canvas-backgrounds' 
  AND (
    -- Canvas background images (requires authentication)
    (auth.uid() IS NOT NULL AND name ~ '^[a-f0-9\-]+/.*\.(jpg|jpeg|png|gif|webp)$')
    OR
    -- Media files in media/ folder (public access)
    name ~ '^media/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi|ogg)$'
  )
);