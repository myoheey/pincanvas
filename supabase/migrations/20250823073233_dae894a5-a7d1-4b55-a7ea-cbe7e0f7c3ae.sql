-- Create secure views that mask email addresses based on user permissions

-- Create a secure comments view that conditionally shows email addresses
CREATE OR REPLACE VIEW public.secure_comments AS
SELECT 
  id,
  pin_id,
  content,
  author_name,
  CASE 
    WHEN user_can_see_emails_for_canvas(
      (SELECT canvas_id FROM pins WHERE pins.id = comments.pin_id)
    ) THEN author_email
    ELSE NULL
  END AS author_email,
  created_at,
  updated_at
FROM public.comments;

-- Create a secure likes view that conditionally shows email addresses  
CREATE OR REPLACE VIEW public.secure_likes AS
SELECT 
  id,
  pin_id,
  author_name,
  CASE 
    WHEN user_can_see_emails_for_canvas(
      (SELECT canvas_id FROM pins WHERE pins.id = likes.pin_id)
    ) THEN author_email
    ELSE NULL
  END AS author_email,
  created_at
FROM public.likes;

-- Grant access to the secure views for all users
GRANT SELECT ON public.secure_comments TO authenticated, anon;
GRANT SELECT ON public.secure_likes TO authenticated, anon;

-- Create RLS policies for the secure views (allowing all authenticated and anonymous users to read)
ALTER VIEW public.secure_comments SET (security_invoker = on);
ALTER VIEW public.secure_likes SET (security_invoker = on);