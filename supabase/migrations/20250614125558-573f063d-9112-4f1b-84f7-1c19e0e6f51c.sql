
-- Enable RLS on direct_messages table
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view direct messages they are part of
CREATE POLICY "Users can view their own direct messages" 
  ON public.direct_messages 
  FOR SELECT 
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Allow users to create direct messages
CREATE POLICY "Users can create direct messages" 
  ON public.direct_messages 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Allow users to update their direct messages (if needed)
CREATE POLICY "Users can update their own direct messages" 
  ON public.direct_messages 
  FOR UPDATE 
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Allow users to delete their direct messages (if needed)
CREATE POLICY "Users can delete their own direct messages" 
  ON public.direct_messages 
  FOR DELETE 
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );
