
-- First create the workspace if it doesn't exist, then add the data
DO $$
DECLARE
    workspace_uuid UUID := 'af4fde3f-1234-5678-9abc-000000000000'::UUID;
    existing_user_ids UUID[];
    channel_general UUID;
    channel_it_ai UUID;
    channel_dev UUID;
    channel_design UUID;
    channel_announcements UUID;
    channel_watercooler UUID;
    dm_id_1 UUID;
    message_id_1 UUID;
    message_id_2 UUID;
    message_id_3 UUID;
BEGIN
    -- Get existing user IDs from profiles
    SELECT array_agg(id) INTO existing_user_ids FROM public.profiles;
    
    -- Only proceed if we have users
    IF array_length(existing_user_ids, 1) > 0 THEN
        -- Create the workspace if it doesn't exist
        INSERT INTO public.workspaces (id, name, description, created_by, invite_code) 
        VALUES (
            workspace_uuid, 
            'AI & Tech Workspace', 
            'Collaborative workspace for AI, ML, and technology discussions',
            existing_user_ids[1],
            'AITECH01'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Add existing users as workspace members (skip if already exists)
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        SELECT workspace_uuid, unnest(existing_user_ids), 'member'::user_role
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
        
        -- Make the first user an admin
        UPDATE public.workspace_members 
        SET role = 'admin'::user_role 
        WHERE workspace_id = workspace_uuid AND user_id = existing_user_ids[1];
        
        -- Create additional channels (IT AI focused)
        INSERT INTO public.channels (id, workspace_id, name, description, type, created_by) VALUES
        (gen_random_uuid(), workspace_uuid, 'general', 'General discussions and team updates', 'public', existing_user_ids[1]),
        (gen_random_uuid(), workspace_uuid, 'it-ai', 'AI, Machine Learning, and IT discussions', 'public', existing_user_ids[1]),
        (gen_random_uuid(), workspace_uuid, 'dev-team', 'Development team discussions', 'public', existing_user_ids[1]),
        (gen_random_uuid(), workspace_uuid, 'design', 'Design team collaboration', 'public', existing_user_ids[1]),
        (gen_random_uuid(), workspace_uuid, 'announcements', 'Company announcements', 'public', existing_user_ids[1]),
        (gen_random_uuid(), workspace_uuid, 'watercooler', 'Casual chats and coffee talks', 'public', existing_user_ids[1])
        ON CONFLICT (workspace_id, name) DO NOTHING;
        
        -- Get channel IDs
        SELECT id INTO channel_general FROM public.channels WHERE name = 'general' AND workspace_id = workspace_uuid;
        SELECT id INTO channel_it_ai FROM public.channels WHERE name = 'it-ai' AND workspace_id = workspace_uuid;
        SELECT id INTO channel_dev FROM public.channels WHERE name = 'dev-team' AND workspace_id = workspace_uuid;
        SELECT id INTO channel_design FROM public.channels WHERE name = 'design' AND workspace_id = workspace_uuid;
        SELECT id INTO channel_announcements FROM public.channels WHERE name = 'announcements' AND workspace_id = workspace_uuid;
        SELECT id INTO channel_watercooler FROM public.channels WHERE name = 'watercooler' AND workspace_id = workspace_uuid;
        
        -- Add existing users to all channels
        INSERT INTO public.channel_members (channel_id, user_id)
        SELECT channel_general, unnest(existing_user_ids)
        WHERE channel_general IS NOT NULL
        UNION ALL
        SELECT channel_it_ai, unnest(existing_user_ids)
        WHERE channel_it_ai IS NOT NULL
        UNION ALL
        SELECT channel_dev, unnest(existing_user_ids)
        WHERE channel_dev IS NOT NULL
        UNION ALL
        SELECT channel_design, unnest(existing_user_ids)
        WHERE channel_design IS NOT NULL
        UNION ALL
        SELECT channel_announcements, unnest(existing_user_ids)
        WHERE channel_announcements IS NOT NULL
        UNION ALL
        SELECT channel_watercooler, unnest(existing_user_ids)
        WHERE channel_watercooler IS NOT NULL
        ON CONFLICT (channel_id, user_id) DO NOTHING;
        
        -- Create sample messages in channels using existing users
        IF channel_general IS NOT NULL THEN
            INSERT INTO public.messages (id, channel_id, sender_id, content, created_at, reply_count) VALUES
            (gen_random_uuid(), channel_general, existing_user_ids[1], 'Welcome to our AI & Tech workspace! This is where we collaborate and share ideas.', now() - interval '7 days', 2),
            (gen_random_uuid(), channel_general, existing_user_ids[1], 'Feel free to ask questions and jump into any discussions.', now() - interval '6 days', 0),
            (gen_random_uuid(), channel_general, existing_user_ids[1], 'Great to have everyone on board! Looking forward to working together.', now() - interval '5 days', 1);
        END IF;
        
        IF channel_it_ai IS NOT NULL THEN
            INSERT INTO public.messages (id, channel_id, sender_id, content, created_at, reply_count) VALUES
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'Just tried GPT-4o and the multimodal capabilities are incredible! Anyone else experimenting with it?', now() - interval '4 days', 3),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'Our ML model training is taking forever. Any suggestions for optimizing PyTorch performance?', now() - interval '3 days', 2),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'Interesting paper on transformer architecture: "Attention Is All You Need 2.0" 🤖', now() - interval '2 days', 1),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'Setting up new AI infrastructure with NVIDIA A100s. The performance gains are amazing!', now() - interval '1 day', 2),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'ChatGPT API integration working smoothly. Cost optimization tips anyone?', now() - interval '12 hours', 1),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'Vector databases comparison: Pinecone vs Weaviate vs Qdrant. Thoughts?', now() - interval '6 hours', 0),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'LangChain vs LlamaIndex for RAG applications - which one do you prefer?', now() - interval '4 hours', 1),
            (gen_random_uuid(), channel_it_ai, existing_user_ids[1], 'Fine-tuning LLAMA 2 for our domain-specific use case. Results looking promising! 🚀', now() - interval '2 hours', 0);
        END IF;
        
        IF channel_dev IS NOT NULL THEN
            INSERT INTO public.messages (id, channel_id, sender_id, content, created_at, reply_count) VALUES
            (gen_random_uuid(), channel_dev, existing_user_ids[1], 'Code review for the authentication module is ready', now() - interval '3 days', 1),
            (gen_random_uuid(), channel_dev, existing_user_ids[1], 'Database migration completed successfully 🎉', now() - interval '2 days', 0),
            (gen_random_uuid(), channel_dev, existing_user_ids[1], 'New API documentation is live! Check it out', now() - interval '1 day', 1),
            (gen_random_uuid(), channel_dev, existing_user_ids[1], 'GitHub Copilot is really helping with code completion. Anyone else using AI coding tools?', now() - interval '8 hours', 2);
        END IF;
        
        IF channel_announcements IS NOT NULL THEN
            INSERT INTO public.messages (id, channel_id, sender_id, content, created_at, reply_count) VALUES
            (gen_random_uuid(), channel_announcements, existing_user_ids[1], 'Welcome to the team! Important updates will be posted here.', now() - interval '5 days', 0),
            (gen_random_uuid(), channel_announcements, existing_user_ids[1], 'New AI ethics guidelines have been published - please review', now() - interval '2 days', 0);
        END IF;
        
        IF channel_watercooler IS NOT NULL THEN
            INSERT INTO public.messages (id, channel_id, sender_id, content, created_at, reply_count) VALUES
            (gen_random_uuid(), channel_watercooler, existing_user_ids[1], 'Coffee thoughts: Do you think AGI will arrive by 2030? ☕🤖', now() - interval '4 days', 2),
            (gen_random_uuid(), channel_watercooler, existing_user_ids[1], 'Best AI productivity tools? Currently using GitHub Copilot and Claude', now() - interval '1 day', 1);
        END IF;
        
        -- Get some message IDs for threading
        SELECT id INTO message_id_1 FROM public.messages WHERE content LIKE 'Welcome to our AI & Tech workspace%' AND channel_id = channel_general LIMIT 1;
        SELECT id INTO message_id_2 FROM public.messages WHERE content LIKE 'Just tried GPT-4o%' AND channel_id = channel_it_ai LIMIT 1;
        SELECT id INTO message_id_3 FROM public.messages WHERE content LIKE 'Our ML model training%' AND channel_id = channel_it_ai LIMIT 1;
        
        -- Create some thread replies
        IF message_id_1 IS NOT NULL THEN
            INSERT INTO public.thread_replies (thread_id, workspace_id, sender_id, reply_text, created_at) VALUES
            (message_id_1, workspace_uuid, existing_user_ids[1], 'Thanks for setting this up! Looking forward to collaborating on AI projects.', now() - interval '6 days 23 hours'),
            (message_id_1, workspace_uuid, existing_user_ids[1], 'Great workspace setup. The AI channel is particularly exciting!', now() - interval '6 days 22 hours');
        END IF;
        
        IF message_id_2 IS NOT NULL THEN
            INSERT INTO public.thread_replies (thread_id, workspace_id, sender_id, reply_text, created_at) VALUES
            (message_id_2, workspace_uuid, existing_user_ids[1], 'Yes! The image understanding is game-changing for our computer vision pipeline.', now() - interval '4 days 23 hours'),
            (message_id_2, workspace_uuid, existing_user_ids[1], 'Planning to integrate it for document analysis soon.', now() - interval '4 days 22 hours'),
            (message_id_2, workspace_uuid, existing_user_ids[1], 'The multimodal aspect opens up so many possibilities for our products!', now() - interval '4 days 21 hours');
        END IF;
        
        IF message_id_3 IS NOT NULL THEN
            INSERT INTO public.thread_replies (thread_id, workspace_id, sender_id, reply_text, created_at) VALUES
            (message_id_3, workspace_uuid, existing_user_ids[1], 'Try using mixed precision training with torch.cuda.amp - it can speed things up significantly!', now() - interval '3 days 23 hours'),
            (message_id_3, workspace_uuid, existing_user_ids[1], 'Also consider gradient accumulation if you have memory constraints.', now() - interval '3 days 22 hours');
        END IF;
        
        -- If we have multiple users, create a DM conversation
        IF array_length(existing_user_ids, 1) > 1 THEN
            INSERT INTO public.direct_messages (id, workspace_id, user1_id, user2_id) VALUES
            (gen_random_uuid(), workspace_uuid, existing_user_ids[1], existing_user_ids[2]);
            
            SELECT id INTO dm_id_1 FROM public.direct_messages 
            WHERE user1_id = existing_user_ids[1] AND user2_id = existing_user_ids[2] AND workspace_id = workspace_uuid;
            
            IF dm_id_1 IS NOT NULL THEN
                INSERT INTO public.messages (dm_id, sender_id, content, created_at) VALUES
                (dm_id_1, existing_user_ids[1], 'Hey! How are you finding the new AI workspace setup?', now() - interval '2 days'),
                (dm_id_1, existing_user_ids[2], 'Really good! The IT-AI channel has some great discussions.', now() - interval '2 days' + interval '30 minutes'),
                (dm_id_1, existing_user_ids[1], 'Agreed! Looking forward to more machine learning conversations.', now() - interval '2 days' + interval '1 hour');
            END IF;
        END IF;
        
        -- Add some AI-themed reactions to messages
        INSERT INTO public.message_reactions (message_id, user_id, emoji) 
        SELECT m.id, existing_user_ids[1], 
               (ARRAY['🤖', '🚀', '💡', '🔥', '👨‍💻', '🧠'])[floor(random() * 6) + 1]
        FROM public.messages m 
        WHERE m.channel_id IS NOT NULL AND m.channel_id IN (channel_it_ai, channel_general, channel_dev)
        ORDER BY random() 
        LIMIT 8;
        
        -- Pin important messages
        INSERT INTO public.pinned_messages (message_id, workspace_id, channel_id, pinned_by_user_id)
        SELECT m.id, workspace_uuid, m.channel_id, existing_user_ids[1]
        FROM public.messages m
        WHERE (m.content LIKE '%Welcome to our AI & Tech workspace%' OR m.content LIKE '%AI ethics guidelines%')
        AND m.channel_id IS NOT NULL
        LIMIT 2;
        
    END IF;
END $$;
