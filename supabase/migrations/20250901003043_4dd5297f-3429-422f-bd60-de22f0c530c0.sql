-- Enable RLS for tables that exist but don't have it enabled
-- Note: Some tables already have RLS enabled, so we only enable where needed

-- Update function to set proper search_path to fix function warnings
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_has_canvas_access_with_permission(canvas_id uuid, user_id uuid, required_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  BEGIN
    -- If no user, deny access
    IF user_id IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Check if user owns the canvas (owners have all permissions)
    IF EXISTS (
      SELECT 1 FROM public.canvases
      WHERE id = canvas_id AND owner_id = user_id
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check public canvas permissions
    IF EXISTS (
      SELECT 1 FROM public.canvases
      WHERE id = canvas_id
      AND is_public = true
      AND (
        required_permission = 'viewer'
        OR (required_permission = 'editor' AND public_permission = 'editor')
      )
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check explicit share permissions
    IF EXISTS (
      SELECT 1 FROM public.canvas_shares cs
      JOIN auth.users u ON u.email = cs.shared_with_email
      WHERE cs.canvas_id = canvas_id
      AND u.id = user_id
      AND (
        required_permission = 'viewer'
        OR (required_permission = 'editor' AND cs.permission = 'editor')
      )
    ) THEN
      RETURN TRUE;
    END IF;

    RETURN FALSE;
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_canvas_access(canvas_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  BEGIN
    -- If no user, deny access
    IF user_id IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Check if user owns the canvas
    IF EXISTS (
      SELECT 1 FROM public.canvases
      WHERE id = canvas_id AND owner_id = user_id
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check if canvas is public
    IF EXISTS (
      SELECT 1 FROM public.canvases
      WHERE id = canvas_id AND is_public = true
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check if user has explicit share access
    IF EXISTS (
      SELECT 1 FROM public.canvas_shares cs
      JOIN auth.users u ON u.email = cs.shared_with_email
      WHERE cs.canvas_id = canvas_id AND u.id = user_id
    ) THEN
      RETURN TRUE;
    END IF;

    RETURN FALSE;
  END;
$$;