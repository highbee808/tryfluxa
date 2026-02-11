-- Spotify OAuth token storage with RLS
CREATE TABLE IF NOT EXISTS public.spotify_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_user_id TEXT,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.spotify_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own row
CREATE POLICY "Users can read own spotify account"
  ON public.spotify_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spotify account"
  ON public.spotify_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spotify account"
  ON public.spotify_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spotify account"
  ON public.spotify_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_spotify_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spotify_accounts_updated_at
  BEFORE UPDATE ON public.spotify_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_spotify_accounts_updated_at();
