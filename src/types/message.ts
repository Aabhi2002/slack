
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_pinned?: boolean;
  reply_count?: number;
  profiles: {
    full_name: string;
    email: string;
  };
  message_reactions: Array<{
    emoji: string;
    user_id: string;
  }>;
  attachments?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    file_name: string;
    file_size: number | null;
  }>;
}

export interface ThreadReply {
  id: string;
  thread_id: string;
  workspace_id: string;
  sender_id: string;
  reply_text: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}
