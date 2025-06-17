
-- Drop the trigger first (only if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'thread_reply_insert_trigger') THEN
        DROP TRIGGER thread_reply_insert_trigger ON public.thread_replies;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'thread_reply_delete_trigger') THEN
        DROP TRIGGER thread_reply_delete_trigger ON public.thread_replies;
    END IF;
END $$;

-- Drop the trigger function (only if it exists)
DROP FUNCTION IF EXISTS public.update_message_reply_count();

-- Drop indexes (only if they exist)
DROP INDEX IF EXISTS memory_embedding_idx;
DROP INDEX IF EXISTS memory_thread_idx;
DROP INDEX IF EXISTS memory_workspace_idx;

-- Drop tables (only if they exist)
DROP TABLE IF EXISTS public.thread_replies;
DROP TABLE IF EXISTS public.memory;

-- Remove columns from messages table (only if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'parent_message_id') THEN
        ALTER TABLE public.messages DROP COLUMN parent_message_id;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_count') THEN
        ALTER TABLE public.messages DROP COLUMN reply_count;
    END IF;
END $$;
