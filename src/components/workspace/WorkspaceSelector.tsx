
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Users, Copy } from 'lucide-react';
import React from "react";

interface Workspace {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  member_count: number;
  user_role: string;
}

export function WorkspaceSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          workspaces (
            id,
            name,
            description,
            invite_code
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const workspaceList = data?.map(item => ({
        id: item.workspaces.id,
        name: item.workspaces.name,
        description: item.workspaces.description,
        invite_code: item.workspaces.invite_code,
        member_count: 0,
        user_role: item.role
      })) || [];

      setWorkspaces(workspaceList);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast({
        title: "Error",
        description: "Failed to load workspaces",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name,
          description,
          created_by: user?.id
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user?.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Create default general channel
      const { error: channelError } = await supabase
        .from('channels')
        .insert({
          workspace_id: workspace.id,
          name: 'general',
          description: 'General discussion channel',
          type: 'public',
          created_by: user?.id
        });

      if (channelError) throw channelError;

      toast({
        title: "Workspace created!",
        description: `${name} has been created successfully.`
      });

      navigate(`/workspace/${workspace.id}`);
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workspace",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const joinWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const inviteCode = formData.get('inviteCode') as string;

    try {
      // Find workspace by invite code
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('invite_code', inviteCode)
        .single();

      if (workspaceError) {
        toast({
          title: "Invalid invite code",
          description: "The workspace invite code is not valid.",
          variant: "destructive"
        });
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user?.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this workspace."
        });
        navigate(`/workspace/${workspace.id}`);
        return;
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user?.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      toast({
        title: "Joined workspace!",
        description: `You've successfully joined ${workspace.name}.`
      });

      navigate(`/workspace/${workspace.id}`);
    } catch (error: any) {
      console.error('Error joining workspace:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join workspace",
        variant: "destructive"
      });
    }
  };

  // --- Copy invite code functionality ---
  const handleCopyInvite = (invite_code: string) => {
    navigator.clipboard.writeText(invite_code);
    toast({
      title: "Invite code copied!",
      description: "The invite code has been copied to your clipboard.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#25134d] via-[#6929a5] to-[#37206a] p-4 flex justify-center items-start">
      <div className="max-w-4xl w-full mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">
            Choose Your Workspace
          </h1>
          <p className="text-slate-200 text-lg font-medium">Select an existing workspace or create a new one</p>
        </div>

        {workspaces.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-5 tracking-wide">Your Workspaces</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {workspaces.map((workspace) => (
                <Card 
                  key={workspace.id} 
                  className="bg-[#1a2036] border-0 shadow-xl rounded-2xl px-6 py-6 cursor-pointer hover:scale-[1.025] hover:shadow-2xl hover:ring-2 hover:ring-purple-600 transition-all duration-200 relative"
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') navigate(`/workspace/${workspace.id}`); }}
                  aria-label={`Open workspace ${workspace.name}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-white text-xl font-bold truncate">{workspace.name}</CardTitle>
                      <Badge className={`uppercase ${workspace.user_role === 'admin' ? 'bg-purple-600' : 'bg-slate-700'}`}>
                        {workspace.user_role}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-300">
                      {workspace.description || <span className="italic text-slate-400">No description</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-base text-slate-400 select-none mt-2">
                      <Users className="w-4 h-4 mr-1" />
                      Invite code: 
                      <span className="font-mono font-semibold text-white bg-slate-800 rounded px-2 py-1">{workspace.invite_code}</span>
                      <button
                        className="ml-2 text-purple-400 hover:text-purple-300 active:scale-95 transition"
                        onClick={e => { e.stopPropagation(); handleCopyInvite(workspace.invite_code); }}
                        tabIndex={0}
                        aria-label="Copy invite code"
                        type="button"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Card className="bg-[#232445]/95 border-0 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center text-xl font-bold">
              <Plus className="w-5 h-5 mr-2 text-purple-400" />
              Workspace Actions
            </CardTitle>
            <CardDescription className="text-slate-300">
              Create a new workspace or join an existing one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-lg mb-2 overflow-hidden">
                <TabsTrigger value="create" className="text-slate-300 data-[state=active]:text-purple-400 data-[state=active]:bg-slate-900/70 data-[state=active]:shadow">
                  Create Workspace
                </TabsTrigger>
                <TabsTrigger value="join" className="text-slate-300 data-[state=active]:text-purple-400 data-[state=active]:bg-slate-900/70 data-[state=active]:shadow">
                  Join Workspace
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4">
                <form onSubmit={createWorkspace} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      name="name"
                      placeholder="Workspace name"
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      name="description"
                      placeholder="Description (optional)"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 hover:from-purple-700 hover:to-purple-600 text-white font-bold uppercase tracking-wide py-3 rounded-lg shadow-lg"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Workspace'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="join" className="space-y-4">
                <form onSubmit={joinWorkspace} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      name="inviteCode"
                      placeholder="Enter workspace invite code"
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-600 via-green-500 to-green-700 hover:from-green-700 hover:to-green-600 text-white font-bold uppercase tracking-wide py-3 rounded-lg shadow-lg"
                  >
                    Join Workspace
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
