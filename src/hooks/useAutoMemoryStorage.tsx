
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAutoMemoryStorageProps {
  replyText: string;
  threadId: string;
  workspaceId: string;
  replyId?: string;
}

export const useAutoMemoryStorage = ({ 
  replyText, 
  threadId, 
  workspaceId, 
  replyId 
}: UseAutoMemoryStorageProps) => {
  
  useEffect(() => {
    const storeReplyMemory = async () => {
      if (!replyText.trim() || !replyId) return;

      try {
        // Generate embedding for the reply
        const { data, error } = await supabase.functions.invoke('store-reply-memory', {
          body: {
            replyText,
            threadId,
            workspaceId,
            replyId
          }
        });

        if (error) {
          console.error('Error storing reply memory:', error);
        }
      } catch (error) {
        console.error('Failed to store reply memory:', error);
      }
    };

    storeReplyMemory();
  }, [replyText, threadId, workspaceId, replyId]);
};
