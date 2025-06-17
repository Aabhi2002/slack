
-- Fix the workspace creation policy to allow authenticated users to create workspaces
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);
