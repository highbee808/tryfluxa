-- Create live sessions table
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  host_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  replay_audio_url TEXT,
  chat_history JSONB DEFAULT '[]'::jsonb,
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live session participants table
CREATE TABLE IF NOT EXISTS public.live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT DEFAULT 'listener' CHECK (role IN ('listener', 'co-host')),
  is_speaking BOOLEAN DEFAULT false,
  hand_raised BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live reactions table
CREATE TABLE IF NOT EXISTS public.live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_sessions
CREATE POLICY "Anyone can view live or scheduled sessions"
  ON public.live_sessions FOR SELECT
  USING (status IN ('live', 'scheduled'));

CREATE POLICY "Service role can manage sessions"
  ON public.live_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for live_participants
CREATE POLICY "Users can view session participants"
  ON public.live_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join sessions"
  ON public.live_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON public.live_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave sessions"
  ON public.live_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for live_reactions
CREATE POLICY "Users can view reactions"
  ON public.live_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can send reactions"
  ON public.live_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;