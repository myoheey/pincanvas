-- Add background settings to canvases table
ALTER TABLE public.canvases 
ADD COLUMN background_type TEXT DEFAULT 'color' CHECK (background_type IN ('color', 'image')),
ADD COLUMN background_color TEXT DEFAULT '#ffffff',
ADD COLUMN background_image_url TEXT;