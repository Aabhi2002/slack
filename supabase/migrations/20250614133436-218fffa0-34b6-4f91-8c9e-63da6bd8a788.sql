
-- Create pinned_messages table
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, message_id)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for pinned_messages
CREATE POLICY "Users can view pinned messages in their workspace channels" 
  ON public.pinned_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_members.workspace_id = pinned_messages.workspace_id 
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can pin messages in their workspace channels" 
  ON public.pinned_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_members.workspace_id = pinned_messages.workspace_id 
      AND workspace_members.user_id = auth.uid()
    )
    AND pinned_by_user_id = auth.uid()
  );

CREATE POLICY "Users can unpin messages they pinned or admins can unpin any" 
  ON public.pinned_messages 
  FOR DELETE 
  USING (
    pinned_by_user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_members.workspace_id = pinned_messages.workspace_id 
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  );

-- Add index for better performance
CREATE INDEX idx_pinned_messages_channel_id ON public.pinned_messages(channel_id);
CREATE INDEX idx_pinned_messages_workspace_id ON public.pinned_messages(workspace_id);
