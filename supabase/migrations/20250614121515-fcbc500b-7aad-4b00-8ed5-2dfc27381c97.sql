
-- Create a security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = $1 AND workspace_members.user_id = $2
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view workspace members in their workspaces" ON public.workspace_members;

-- Create a new policy using the security definer function
CREATE POLICY "Users can view workspace members in their workspaces" ON public.workspace_members
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Also fix the workspace admins policy to avoid recursion
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;

-- Create a function to check if user is workspace admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(workspace_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = $1 
    AND workspace_members.user_id = $2 
    AND workspace_members.role = 'admin'
  );
$$;

-- Create new admin policy using the function
CREATE POLICY "Workspace admins can manage members" ON public.workspace_members
  FOR ALL USING (public.is_workspace_admin(workspace_id, auth.uid()));
