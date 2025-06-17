
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, workspaceId } = await req.json();
    
    if (!threadId || !workspaceId) {
      throw new Error('Missing threadId or workspaceId');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch thread context (original message + recent replies)
    const { data: threadReplies, error: repliesError } = await supabase
      .from('thread_replies')
      .select(`
        reply_text,
        created_at,
        profiles!sender_id (full_name, email)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (repliesError) throw repliesError;

    // 2. Get the original message
    const { data: originalMessage, error: messageError } = await supabase
      .from('messages')
      .select(`
        content,
        profiles!sender_id (full_name, email)
      `)
      .eq('id', threadId)
      .single();

    if (messageError) throw messageError;

    // 3. Build context string
    let context = `Original message by ${originalMessage.profiles?.full_name || originalMessage.profiles?.email}: ${originalMessage.content}\n\n`;
    
    if (threadReplies && threadReplies.length > 0) {
      context += "Recent replies:\n";
      threadReplies.forEach((reply, index) => {
        const author = reply.profiles?.full_name || reply.profiles?.email;
        context += `${index + 1}. ${author}: ${reply.reply_text}\n`;
      });
    }

    // 4. Generate embedding for context
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: context,
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // 5. Search for similar historical replies
    const { data: similarReplies, error: searchError } = await supabase
      .rpc('match_thread_memory', {
        query_embedding: embedding,
        target_workspace_id: workspaceId,
        match_threshold: 0.7,
        match_count: 3
      });

    if (searchError) console.log('Search error (non-critical):', searchError);

    // 6. Build prompt for AI suggestion
    let prompt = `Based on the following thread conversation, suggest a helpful and contextually appropriate reply:

${context}`;

    if (similarReplies && similarReplies.length > 0) {
      prompt += `\n\nSimilar past discussions in this workspace:\n`;
      similarReplies.forEach((similar, index) => {
        prompt += `${index + 1}. ${similar.content}\n`;
      });
    }

    prompt += `\n\nGenerate a helpful, professional reply that adds value to the conversation. Keep it concise and natural.`;

    // 7. Generate AI suggestion
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests professional, contextual replies for workplace conversations. Keep responses natural and concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    const suggestedReply = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ 
      suggestedReply,
      contextUsed: context,
      similarRepliesFound: similarReplies?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-reply function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate reply suggestion' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
