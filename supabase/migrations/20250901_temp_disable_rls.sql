-- TEMPORARY: Disable RLS for development testing
-- WARNING: This is for development only! Do not use in production!

-- Disable RLS on problematic tables temporarily
ALTER TABLE public.drawings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;

-- Recreate the secure views without RLS dependency for now
DROP VIEW IF EXISTS public.secure_comments;
CREATE OR REPLACE VIEW public.secure_comments AS
SELECT 
  id,
  pin_id,
  content,
  author_name,
  author_email,
  created_at,
  updated_at
FROM public.comments;

DROP VIEW IF EXISTS public.secure_likes;
CREATE OR REPLACE VIEW public.secure_likes AS
SELECT 
  id,
  pin_id,
  author_name,
  author_email,
  created_at
FROM public.likes;

-- Grant permissions
GRANT SELECT ON public.secure_comments TO authenticated, anon;
GRANT SELECT ON public.secure_likes TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawings TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated, anon;