-- Music Cache Tables for cost-efficient API usage

-- Music items cache (tracks, albums, news, gossip)
CREATE TABLE IF NOT EXISTS public.music_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('track', 'album', 'news', 'gossip')),
  source_id TEXT NOT NULL, -- ID from external API (Spotify, Last.fm, etc.)
  title TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  artist_id TEXT, -- Can be artist slug or external ID
  artist_name TEXT,
  genre TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, source_id)
);

-- Artist cache
CREATE TABLE IF NOT EXISTS public.artist_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT NOT NULL UNIQUE, -- External API ID or slug
  name TEXT NOT NULL,
  slug TEXT, -- URL-friendly slug
  bio_summary TEXT,
  image_url TEXT,
  genres TEXT[], -- Array of genres
  top_tracks JSONB, -- Array of track objects
  top_albums JSONB, -- Array of album objects
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Genre cache
CREATE TABLE IF NOT EXISTS public.genre_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id TEXT NOT NULL UNIQUE, -- Genre name or ID
  name TEXT NOT NULL,
  description TEXT,
  top_artists JSONB, -- Array of artist objects
  top_tracks JSONB, -- Array of track objects
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_music_items_artist_id ON public.music_items(artist_id);
CREATE INDEX IF NOT EXISTS idx_music_items_genre ON public.music_items(genre);
CREATE INDEX IF NOT EXISTS idx_music_items_type ON public.music_items(type);
CREATE INDEX IF NOT EXISTS idx_music_items_published_at ON public.music_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_artist_cache_slug ON public.artist_cache(slug);
CREATE INDEX IF NOT EXISTS idx_genre_cache_name ON public.genre_cache(name);

-- Enable RLS
ALTER TABLE public.music_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genre_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow public read access for cached data
CREATE POLICY "Anyone can view music_items" ON public.music_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view artist_cache" ON public.artist_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can view genre_cache" ON public.genre_cache FOR SELECT USING (true);

-- Only authenticated users can insert/update (for admin/edge functions)
CREATE POLICY "Authenticated users can manage music_items" ON public.music_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage artist_cache" ON public.artist_cache FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage genre_cache" ON public.genre_cache FOR ALL USING (auth.role() = 'authenticated');

