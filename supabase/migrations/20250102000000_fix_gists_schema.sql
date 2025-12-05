-- Fix gists schema for Pipeline v2
-- Drops existing table and recreates with correct columns

DROP TABLE IF EXISTS gists CASCADE;

CREATE TABLE gists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic text NOT NULL,
    topic_category text DEFAULT 'Trending',
    headline text,
    context text,
    narration text,
    script text,
    image_url text,
    source_url text,
    news_published_at timestamptz,
    audio_url text DEFAULT '',
    status text DEFAULT 'published',
    created_at timestamptz DEFAULT NOW(),
    published_at timestamptz,
    meta jsonb DEFAULT '{}'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS gists_topic_idx ON gists (topic);
CREATE INDEX IF NOT EXISTS gists_created_at_idx ON gists (created_at DESC);
CREATE INDEX IF NOT EXISTS gists_status_idx ON gists (status);
CREATE INDEX IF NOT EXISTS gists_topic_category_idx ON gists (topic_category);

-- Enable Row Level Security
ALTER TABLE gists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can read published gists" ON gists
    FOR SELECT
    USING (status = 'published');

CREATE POLICY "Service role can do everything" ON gists
    FOR ALL
    USING (true)
    WITH CHECK (true);

