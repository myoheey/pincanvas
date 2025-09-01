-- Enable RLS for all public tables
ALTER TABLE public.pin_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_template_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_shares ENABLE ROW LEVEL SECURITY;

-- Enable RLS for pins table (if not already enabled)
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Create policies for pin_templates table
CREATE POLICY "Anyone can view pin templates" 
ON pin_templates 
FOR SELECT 
USING (true);

-- Create policies for pin_template_history table  
CREATE POLICY "Users can view pin template history of their canvases" 
ON pin_template_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pin_template_history.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR canvases.is_public = true
    )
  )
);

-- Create policies for canvases table
CREATE POLICY "Users can view accessible canvases" 
ON canvases 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR is_public = true
);

CREATE POLICY "Users can create their own canvases" 
ON canvases 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own canvases" 
ON canvases 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own canvases" 
ON canvases 
FOR DELETE 
USING (owner_id = auth.uid());

-- Create policies for canvas_shares table
CREATE POLICY "Users can view shares of their canvases" 
ON canvas_shares 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create shares for their canvases" 
ON canvas_shares 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update shares for their canvases" 
ON canvas_shares 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete shares for their canvases" 
ON canvas_shares 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = canvas_shares.canvas_id 
    AND canvases.owner_id = auth.uid()
  )
);

-- Update function to set proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;