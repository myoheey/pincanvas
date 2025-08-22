-- Create storage bucket for pin template images
INSERT INTO storage.buckets (id, name, public) VALUES ('pin-templates', 'pin-templates', true);

-- Create storage policies for pin template images
CREATE POLICY "Users can view pin template images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pin-templates');

CREATE POLICY "Users can upload pin template images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pin-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own pin template images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pin-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own pin template images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pin-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url column to pin_templates table
ALTER TABLE public.pin_templates ADD COLUMN image_url TEXT DEFAULT NULL;