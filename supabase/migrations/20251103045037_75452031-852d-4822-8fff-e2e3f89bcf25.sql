-- Create user_teams table for storing favorite and rival teams
CREATE TABLE public.user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  favorite_teams TEXT[] DEFAULT ARRAY[]::TEXT[],
  rival_teams TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_teams
CREATE POLICY "Users can view own teams"
ON public.user_teams
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own teams"
ON public.user_teams
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teams"
ON public.user_teams
FOR UPDATE
USING (auth.uid() = user_id);

-- Create match_results table for storing football match data
CREATE TABLE public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT UNIQUE NOT NULL,
  league TEXT NOT NULL,
  team_home TEXT NOT NULL,
  team_away TEXT NOT NULL,
  score_home INTEGER,
  score_away INTEGER,
  status TEXT NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy for match_results (publicly readable)
CREATE POLICY "Anyone can view match results"
ON public.match_results
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage match results"
ON public.match_results
FOR ALL
USING (true);