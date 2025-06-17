
-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true);

-- Create storage policies for the bucket
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to files" ON storage.objects
FOR SELECT USING (bucket_id = 'message-attachments');

CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS on attachments table
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attachments
CREATE POLICY "Users can view attachments in their workspaces" ON public.attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = attachments.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create attachments in their workspaces" ON public.attachments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = attachments.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Users can delete their own attachments" ON public.attachments
FOR DELETE USING (uploaded_by = auth.uid());

-- Add index for better query performance
CREATE INDEX idx_attachments_message_id ON public.attachments(message_id);
CREATE INDEX idx_attachments_workspace_id ON public.attachments(workspace_id);
