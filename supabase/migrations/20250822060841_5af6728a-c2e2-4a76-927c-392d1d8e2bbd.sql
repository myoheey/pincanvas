-- Create helper functions for canvas access
CREATE OR REPLACE FUNCTION public.user_has_canvas_access(canvas_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if user owns the canvas or has been granted access
  RETURN EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_id 
    AND (
      canvases.owner_id = user_id
      OR canvases.is_public = true
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = (
          SELECT email FROM auth.users WHERE id = user_id
        )
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_canvas_access_with_permission(canvas_id uuid, user_id uuid, required_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if user owns the canvas (owner has all permissions)
  IF EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_id AND canvases.owner_id = user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if user has the required permission through canvas_shares
  RETURN EXISTS (
    SELECT 1 FROM canvas_shares 
    WHERE canvas_shares.canvas_id = canvas_id 
    AND canvas_shares.shared_with_email = (
      SELECT email FROM auth.users WHERE id = user_id
    )
    AND canvas_shares.permission = required_permission
  );
END;
$$;

-- Create pin templates table for different pin shapes/styles
CREATE TABLE public.pin_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  shape TEXT NOT NULL, -- 'circle', 'square', 'triangle', 'star', 'heart', 'custom'
  color TEXT NOT NULL DEFAULT '#3b82f6',
  size TEXT NOT NULL DEFAULT 'medium', -- 'small', 'medium', 'large'
  icon TEXT, -- lucide icon name or custom icon
  style JSONB, -- Additional style properties
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drawings table for pen drawing functionality  
CREATE TABLE public.drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id UUID NOT NULL,
  layer_id UUID NOT NULL,
  drawing_data JSONB NOT NULL, -- Fabric.js canvas data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add template_id to pins table
ALTER TABLE public.pins ADD COLUMN template_id UUID REFERENCES public.pin_templates(id) DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.pin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

-- RLS policies for pin_templates
CREATE POLICY "Everyone can view public pin templates" 
ON public.pin_templates 
FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own pin templates" 
ON public.pin_templates 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own pin templates" 
ON public.pin_templates 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own pin templates" 
ON public.pin_templates 
FOR DELETE 
USING (created_by = auth.uid());

-- RLS policies for drawings
CREATE POLICY "Users can view drawings of accessible canvases" 
ON public.drawings 
FOR SELECT 
USING (user_has_canvas_access(canvas_id, auth.uid()));

CREATE POLICY "Users can modify drawings of canvases they own or have editor access" 
ON public.drawings 
FOR ALL 
USING (user_has_canvas_access_with_permission(canvas_id, auth.uid(), 'editor'));

-- Insert default pin templates
INSERT INTO public.pin_templates (name, description, shape, color, size, is_default, is_public) VALUES
('기본 원형', '기본 원형 핀', 'circle', '#3b82f6', 'medium', true, true),
('작은 원형', '작은 원형 핀', 'circle', '#3b82f6', 'small', false, true),
('큰 원형', '큰 원형 핀', 'circle', '#3b82f6', 'large', false, true),
('사각형', '사각형 핀', 'square', '#10b981', 'medium', false, true),
('삼각형', '삼각형 핀', 'triangle', '#f59e0b', 'medium', false, true),
('별모양', '별모양 핀', 'star', '#ef4444', 'medium', false, true),
('하트', '하트모양 핀', 'heart', '#ec4899', 'medium', false, true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pin_templates_updated_at
  BEFORE UPDATE ON public.pin_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drawings_updated_at
  BEFORE UPDATE ON public.drawings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();