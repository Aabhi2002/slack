
-- Drop the trigger first
DROP TRIGGER IF EXISTS thread_reply_insert_trigger ON public.thread_replies;
DROP TRIGGER IF EXISTS thread_reply_delete_trigger ON public.thread_replies;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.update_message_reply_count();

-- Drop indexes
DROP INDEX IF EXISTS memory_embedding_idx;
DROP INDEX IF EXISTS memory_thread_idx;
DROP INDEX IF EXISTS memory_workspace_idx;

-- Drop the thread_replies table
DROP TABLE IF EXISTS public.thread_replies;

-- Drop the memory table
DROP TABLE IF EXISTS public.memory;

-- Remove the added columns from messages table
ALTER TABLE public.messages DROP COLUMN IF EXISTS parent_message_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS reply_count;
