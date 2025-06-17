
-- Add support for pinning messages in DMs by allowing dm_id in pinned_messages table
ALTER TABLE public.pinned_messages ADD COLUMN dm_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE;

-- Make channel_id nullable since we now support both channels and DMs
ALTER TABLE public.pinned_messages ALTER COLUMN channel_id DROP NOT NULL;

-- Update the unique constraint to handle both channels and DMs
ALTER TABLE public.pinned_messages DROP CONSTRAINT IF EXISTS pinned_messages_channel_id_message_id_key;
ALTER TABLE public.pinned_messages ADD CONSTRAINT pinned_messages_unique_pin 
  UNIQUE (channel_id, dm_id, message_id);

-- Add a check constraint to ensure either channel_id or dm_id is provided (but not both)
ALTER TABLE public.pinned_messages ADD CONSTRAINT pinned_messages_channel_or_dm_check 
  CHECK ((channel_id IS NOT NULL AND dm_id IS NULL) OR (channel_id IS NULL AND dm_id IS NOT NULL));

-- Update RLS policies to handle DMs
DROP POLICY IF EXISTS "Users can view pinned messages in their workspace channels" ON public.pinned_messages;
DROP POLICY IF EXISTS "Users can pin messages in their workspace channels" ON public.pinned_messages;
DROP POLICY IF EXISTS "Users can unpin messages they pinned or admins can unpin any" ON public.pinned_messages;

-- New policy for viewing pinned messages in both channels and DMs
CREATE POLICY "Users can view pinned messages in their workspace" 
  ON public.pinned_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_members.workspace_id = pinned_messages.workspace_id 
      AND workspace_members.user_id = auth.uid()
    )
  );

-- New policy for pinning messages in both channels and DMs
CREATE POLICY "Users can pin messages in their workspace" 
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

-- New policy for unpinning messages
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
