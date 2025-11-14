-- Create article likes table
CREATE TABLE IF NOT EXISTS public.article_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

-- Create article saves table
CREATE TABLE IF NOT EXISTS public.article_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

-- Create deeper summary requests table
CREATE TABLE IF NOT EXISTS public.deeper_summary_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(article_id, user_id)
);

-- Create voice chat history table
CREATE TABLE IF NOT EXISTS public.voice_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  fluxa_reply TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  emotion TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deeper_summary_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for article_likes
CREATE POLICY "Users can view all likes" ON public.article_likes FOR SELECT USING (true);
CREATE POLICY "Users can create their own likes" ON public.article_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.article_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for article_saves
CREATE POLICY "Users can view their own saves" ON public.article_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own saves" ON public.article_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saves" ON public.article_saves FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for deeper_summary_requests
CREATE POLICY "Users can view their own requests" ON public.deeper_summary_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests" ON public.deeper_summary_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for voice_chat_history
CREATE POLICY "Users can view their own history" ON public.voice_chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own history" ON public.voice_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON public.article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON public.article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_saves_user_id ON public.article_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_article_saves_article_id ON public.article_saves(article_id);
CREATE INDEX IF NOT EXISTS idx_deeper_summary_requests_user_id ON public.deeper_summary_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deeper_summary_requests_status ON public.deeper_summary_requests(status);
CREATE INDEX IF NOT EXISTS idx_voice_chat_history_user_id ON public.voice_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_history_created_at ON public.voice_chat_history(created_at DESC);

-- Enable realtime for voice_chat_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_chat_history;