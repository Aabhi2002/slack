
-- Drop the existing workspace creation policy
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;

-- Drop the new policy if it exists
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.workspaces;

-- Create RLS policy for INSERT operations on workspaces table
-- Checks both authenticated role and that user sets themselves as creator
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);
