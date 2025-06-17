
-- Enable RLS on message_reactions table
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view all reactions (reactions are public within a workspace)
CREATE POLICY "Anyone can view reactions" 
ON public.message_reactions 
FOR SELECT 
USING (true);

-- Allow users to add their own reactions
CREATE POLICY "Users can add their own reactions" 
ON public.message_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "Users can delete their own reactions" 
ON public.message_reactions 
FOR DELETE 
USING (auth.uid() = user_id);
