
-- Fix RLS policies for message_reads table
CREATE POLICY "Users can create message reads for workspace messages" 
  ON public.message_reads 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.workspace_members wm ON wm.workspace_id IN (
        SELECT workspace_id FROM public.channels WHERE id = m.channel_id
        UNION
        SELECT workspace_id FROM public.direct_messages WHERE id = m.dm_id
      )
      WHERE m.id = message_reads.message_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view message reads for workspace messages" 
  ON public.message_reads 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.workspace_members wm ON wm.workspace_id IN (
        SELECT workspace_id FROM public.channels WHERE id = m.channel_id
        UNION
        SELECT workspace_id FROM public.direct_messages WHERE id = m.dm_id
      )
      WHERE m.id = message_reads.message_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Enable realtime for pinned_messages and direct_messages tables
ALTER TABLE public.pinned_messages REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reads REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
