
-- Create thread_replies table for storing threaded conversations
CREATE TABLE public.thread_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on thread_replies table
ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

-- Allow users to view thread replies in workspaces they are members of
CREATE POLICY "Users can view thread replies in their workspaces" 
  ON public.thread_replies 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = thread_replies.workspace_id AND user_id = auth.uid()
    )
  );

-- Allow users to create thread replies in workspaces they are members of
CREATE POLICY "Users can create thread replies in their workspaces" 
  ON public.thread_replies 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = thread_replies.workspace_id AND user_id = auth.uid()
    )
  );

-- Allow users to update their own thread replies
CREATE POLICY "Users can update their own thread replies" 
  ON public.thread_replies 
  FOR UPDATE 
  USING (auth.uid() = sender_id);

-- Allow users to delete their own thread replies
CREATE POLICY "Users can delete their own thread replies" 
  ON public.thread_replies 
  FOR DELETE 
  USING (auth.uid() = sender_id);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_thread_replies_updated_at
  BEFORE UPDATE ON public.thread_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for thread replies
ALTER TABLE public.thread_replies REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_replies;

-- Add reply_count column to messages table to track thread activity
ALTER TABLE public.messages ADD COLUMN reply_count INTEGER DEFAULT 0;

-- Function to update reply count when thread replies are added/removed
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.messages 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.messages 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update reply count
CREATE TRIGGER thread_reply_insert_trigger
  AFTER INSERT ON public.thread_replies
  FOR EACH ROW EXECUTE FUNCTION update_message_reply_count();

CREATE TRIGGER thread_reply_delete_trigger
  AFTER DELETE ON public.thread_replies
  FOR EACH ROW EXECUTE FUNCTION update_message_reply_count();
