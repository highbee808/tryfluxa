-- Create chat_messages table for storing chat conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all chat messages (public chat)
CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert chat messages
CREATE POLICY "Anyone can insert chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster conversation queries
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);