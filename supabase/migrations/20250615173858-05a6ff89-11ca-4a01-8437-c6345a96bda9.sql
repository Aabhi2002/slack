
-- Create org_brain_memory table for RAG-based memory
CREATE TABLE public.org_brain_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  source_type TEXT NOT NULL DEFAULT 'message', -- message, pin, or thread_reply
  source_id UUID NOT NULL, -- ID of the original message/pin/thread
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on org_brain_memory
ALTER TABLE public.org_brain_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Only users who are members of the workspace can SELECT from org_brain_memory
CREATE POLICY "Workspace members can select org brain memory"
  ON public.org_brain_memory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id
      WHERE c.id = org_brain_memory.channel_id AND wm.user_id = auth.uid()
    )
  );

-- Policy: Only allow INSERT if user is a member of workspace
CREATE POLICY "Workspace members can insert org brain memory"
  ON public.org_brain_memory
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id
      WHERE c.id = org_brain_memory.channel_id AND wm.user_id = auth.uid()
    )
  );

-- Function for semantic vector search within a given channel, boosting pinned entries
CREATE OR REPLACE FUNCTION search_org_brain_memory(
  query_embedding vector(1536),
  target_channel_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 8,
  pin_boost float DEFAULT 0.07
)
RETURNS TABLE (
  id uuid,
  content text,
  is_pinned boolean,
  user_id uuid,
  score float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    obm.id,
    obm.content,
    obm.is_pinned,
    obm.user_id,
    (1 - (obm.embedding <#> query_embedding) + (CASE WHEN obm.is_pinned THEN pin_boost ELSE 0 END)) as score
  FROM org_brain_memory obm
  WHERE obm.channel_id = target_channel_id
    AND obm.embedding IS NOT NULL
    AND (obm.embedding <#> query_embedding) < (1 - match_threshold)
  ORDER BY score DESC
  LIMIT match_count;
$$;

