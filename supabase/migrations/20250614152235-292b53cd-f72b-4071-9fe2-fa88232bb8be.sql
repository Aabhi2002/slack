
-- The message_reads table already exists, but let's add an index for better performance
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);

-- Enable Row Level Security on message_reads table
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view read receipts for messages they can see
CREATE POLICY "Users can view read receipts for accessible messages" 
  ON public.message_reads 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      LEFT JOIN public.channels c ON m.channel_id = c.id
      LEFT JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id
      WHERE m.id = message_reads.message_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Create policy that allows users to insert their own read receipts
CREATE POLICY "Users can create their own read receipts" 
  ON public.message_reads 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to update their own read receipts
CREATE POLICY "Users can update their own read receipts" 
  ON public.message_reads 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add a unique constraint to prevent duplicate read receipts
ALTER TABLE public.message_reads 
ADD CONSTRAINT unique_user_message_read 
UNIQUE (message_id, user_id);
