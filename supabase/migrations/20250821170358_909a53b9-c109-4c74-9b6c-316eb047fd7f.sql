-- Drop all existing RLS policies on canvases to start fresh
DROP POLICY IF EXISTS "Users can view their own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can view shared canvases" ON canvases;
DROP POLICY IF EXISTS "Users can update their own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can update shared canvases with editor permission" ON canvases;
DROP POLICY IF EXISTS "Users can create their own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can delete their own canvases" ON canvases;

-- Create simple, working RLS policies
CREATE POLICY "Enable read access for canvas owners"
ON canvases FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Enable insert for authenticated users"
ON canvases FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Enable update for canvas owners"
ON canvases FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Enable delete for canvas owners"
ON canvases FOR DELETE
USING (auth.uid() = owner_id);