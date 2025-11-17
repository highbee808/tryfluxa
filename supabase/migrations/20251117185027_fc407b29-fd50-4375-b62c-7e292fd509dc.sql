-- Fix chat_messages RLS policies to require authentication and scope to user conversations

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;

-- Add proper user-scoped policies
CREATE POLICY "Users view own conversation messages"
  ON chat_messages FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM user_conversations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    conversation_id IN (
      SELECT conversation_id FROM user_conversations WHERE user_id = auth.uid()
    )
  );