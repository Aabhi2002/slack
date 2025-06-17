
-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE channel_type AS ENUM ('public', 'private');
CREATE TYPE message_type AS ENUM ('message', 'system', 'file');

-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace memberships
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Channels table
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type channel_type DEFAULT 'public',
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Channel memberships (for private channels)
CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Direct messages table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT,
  type message_type DEFAULT 'message',
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK ((channel_id IS NOT NULL AND dm_id IS NULL) OR (channel_id IS NULL AND dm_id IS NOT NULL))
);

-- Message reactions table
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Message mentions table
CREATE TABLE public.message_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Typing indicators table
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK ((channel_id IS NOT NULL AND dm_id IS NULL) OR (channel_id IS NULL AND dm_id IS NOT NULL))
);

-- Message read status table
CREATE TABLE public.message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Workspace admins can update workspaces" ON public.workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Workspace members policies
CREATE POLICY "Users can view workspace members in their workspaces" ON public.workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm2 
      WHERE wm2.workspace_id = workspace_id AND wm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join workspaces" ON public.workspace_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workspace admins can manage members" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Channels policies
CREATE POLICY "Users can view channels in their workspaces" ON public.channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()
    ) AND (
      type = 'public' OR 
      EXISTS (
        SELECT 1 FROM public.channel_members 
        WHERE channel_id = id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can create channels" ON public.channels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()
    ) AND auth.uid() = created_by
  );

-- Messages policies
CREATE POLICY "Users can view messages in accessible channels" ON public.messages
  FOR SELECT USING (
    (channel_id IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM public.channels c 
       JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id 
       WHERE c.id = channel_id AND wm.user_id = auth.uid() AND (
         c.type = 'public' OR 
         EXISTS (SELECT 1 FROM public.channel_members WHERE channel_id = c.id AND user_id = auth.uid())
       )
     )
    ) OR 
    (dm_id IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM public.direct_messages dm 
       WHERE dm.id = dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
     )
    )
  );

CREATE POLICY "Users can send messages to accessible channels" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      (channel_id IS NOT NULL AND 
       EXISTS (
         SELECT 1 FROM public.channels c 
         JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id 
         WHERE c.id = channel_id AND wm.user_id = auth.uid() AND (
           c.type = 'public' OR 
           EXISTS (SELECT 1 FROM public.channel_members WHERE channel_id = c.id AND user_id = auth.uid())
         )
       )
      ) OR 
      (dm_id IS NOT NULL AND 
       EXISTS (
         SELECT 1 FROM public.direct_messages dm 
         WHERE dm.id = dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
       )
      )
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for real-time messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
