-- Fix RLS policies for canvas background uploads
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their canvas backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own canvas backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own canvas backgrounds" ON storage.objects;

-- Create new policies that work with canvasId-based folder structure
CREATE POLICY "Authenticated users can upload canvas backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update canvas backgrounds" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete canvas backgrounds" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid() IS NOT NULL
);