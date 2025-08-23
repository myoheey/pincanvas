-- Create storage bucket for canvas background images
INSERT INTO storage.buckets (id, name, public) VALUES ('canvas-backgrounds', 'canvas-backgrounds', true);

-- Create RLS policies for canvas background uploads
CREATE POLICY "Users can upload their canvas backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Canvas backgrounds are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'canvas-backgrounds');

CREATE POLICY "Users can update their own canvas backgrounds" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own canvas backgrounds" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'canvas-backgrounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);