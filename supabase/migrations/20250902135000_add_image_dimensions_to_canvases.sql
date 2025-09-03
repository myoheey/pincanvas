-- Add image width and height columns to canvases table
-- These columns will store the actual dimensions of background images or canvas images

ALTER TABLE canvases 
ADD COLUMN IF NOT EXISTS image_width INTEGER,
ADD COLUMN IF NOT EXISTS image_height INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN canvases.image_width IS 'Width of the canvas background image in pixels';
COMMENT ON COLUMN canvases.image_height IS 'Height of the canvas background image in pixels';

-- Create an index for performance (optional, but good for queries that filter by dimensions)
CREATE INDEX IF NOT EXISTS idx_canvases_dimensions ON canvases(image_width, image_height)
WHERE image_width IS NOT NULL AND image_height IS NOT NULL;