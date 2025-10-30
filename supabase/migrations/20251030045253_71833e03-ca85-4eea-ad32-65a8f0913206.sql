-- Create user_conversations table to track conversation ownership
CREATE TABLE IF NOT EXISTS public.user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS on user_conversations
ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
ON public.user_conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own conversations
CREATE POLICY "Users can create own conversations"
ON public.user_conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop existing overly permissive policies on chat_messages
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON public.chat_messages;

-- Create new conversation-scoped policies for chat_messages
CREATE POLICY "Users can view own conversation messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.user_conversations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own conversation messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.user_conversations 
    WHERE user_id = auth.uid()
  )
);