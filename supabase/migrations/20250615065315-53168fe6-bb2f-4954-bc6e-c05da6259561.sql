
-- Create message_memory table to store embeddings of past replies
CREATE TABLE public.message_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reply_id UUID NOT NULL REFERENCES public.thread_replies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on message_memory table
ALTER TABLE public.message_memory ENABLE ROW LEVEL SECURITY;

-- Allow users to view memory in workspaces they are members of
CREATE POLICY "Users can view memory in their workspaces" 
  ON public.message_memory 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = message_memory.workspace_id AND user_id = auth.uid()
    )
  );

-- Allow users to create memory in workspaces they are members of
CREATE POLICY "Users can create memory in their workspaces" 
  ON public.message_memory 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = message_memory.workspace_id AND user_id = auth.uid()
    )
  );

-- Create function to search similar thread memories using pgvector
CREATE OR REPLACE FUNCTION match_thread_memory(
  query_embedding vector(1536),
  target_workspace_id uuid,
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    message_memory.id,
    message_memory.content,
    1 - (message_memory.embedding <#> query_embedding) as similarity
  FROM message_memory
  WHERE message_memory.workspace_id = target_workspace_id
    AND message_memory.embedding <#> query_embedding < (1 - match_threshold)
  ORDER BY message_memory.embedding <#> query_embedding
  LIMIT match_count;
$$;
