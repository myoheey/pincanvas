-- Disable RLS for development (temporary fix for 406 errors)
-- This should only be used in development environment

-- Disable RLS on drawings table
ALTER TABLE drawings DISABLE ROW LEVEL SECURITY;

-- Disable RLS on pins table  
ALTER TABLE pins DISABLE ROW LEVEL SECURITY;

-- Disable RLS on canvases table
ALTER TABLE canvases DISABLE ROW LEVEL SECURITY;

-- Disable RLS on layers table
ALTER TABLE layers DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow viewing drawings for public canvases" ON drawings;
DROP POLICY IF EXISTS "Allow modifying drawings for public editor canvases" ON drawings;
DROP POLICY IF EXISTS "Allow viewing pins for public canvases" ON pins;
DROP POLICY IF EXISTS "Allow modifying pins for public editor canvases" ON pins;

-- Grant full access to anon and authenticated roles
GRANT ALL ON drawings TO anon, authenticated;
GRANT ALL ON pins TO anon, authenticated;
GRANT ALL ON canvases TO anon, authenticated;
GRANT ALL ON layers TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;